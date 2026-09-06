import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

/** Batch opaque static meshes after interactions and walk colliders are built.
 * Interactive objects, transparent surfaces, and unsupported geometry stay intact.
 * Original/shared materials and geometries are never disposed by this function.
 */
export function optimizeScene({THREE, model}) {
  if (!THREE || !model?.isObject3D) throw new TypeError('optimizeScene needs THREE and a model Object3D.');
  model.updateWorldMatrix(true, true);
  const count = () => {
    let meshes = 0, triangles = 0;
    model.traverse(o => {
      if (!o.isMesh || !o.geometry?.attributes.position) return;
      meshes++;
      triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
    });
    return {meshes, triangles};
  };
  const before = count();
  const beforeBounds = new THREE.Box3().setFromObject(model, true);
  const stats = {before, after: null, triangles: null, mergedGroups: 0, mergedSourceMeshes: 0,
    skipped: {}, failedGroups: [], boundsMaxDelta: 0};
  const skip = reason => {stats.skipped[reason] = (stats.skipped[reason] || 0) + 1;};
  const modelInverse = model.matrixWorld.clone();
  if (Math.abs(modelInverse.determinant()) < 1e-12) {
    stats.after = {...before}; stats.triangles = {before: before.triangles, after: before.triangles, unchanged: true};
    stats.failedGroups.push({reason: 'Singular model transform; left model unchanged.'});
    return stats;
  }
  modelInverse.invert();
  const groups = new Map(), materialIds = new Map();
  const signature = geometry => JSON.stringify({
    indexed: !!geometry.index,
    attributes: Object.keys(geometry.attributes).sort().map(name => {
      const a = geometry.attributes[name];
      return [name, a.itemSize, a.normalized, a.array?.constructor.name, a.gpuType];
    })
  });
  model.traverse(o => {
    if (!o.isMesh) return;
    let ancestor = o;
    while (ancestor) {
      if (ancestor.userData?.interactionId != null) {skip('interactive'); return;}
      if (ancestor === model) break;
      if (ancestor !== o && (!ancestor.visible || ancestor.renderOrder !== 0)) {skip('specialAncestor'); return;}
      ancestor = ancestor.parent;
    }
    const g = o.geometry, m = o.material;
    if (o.isSkinnedMesh || o.isInstancedMesh || g?.isInstancedBufferGeometry) {skip('animatedOrInstanced'); return;}
    if (!g?.isBufferGeometry || !g.attributes.position || !m || Array.isArray(m)) {skip('unsupportedGeometryOrMaterial'); return;}
    if (o.morphTargetInfluences?.length || Object.values(g.morphAttributes || {}).some(a => a.length)) {skip('morph'); return;}
    if (m.transparent || m.opacity < 1 || m.transmission > 0) {skip('transparent'); return;}
    if (o.children.length || o.userData?.noMerge || o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender || o.onAfterRender !== THREE.Object3D.prototype.onAfterRender) {skip('customObject'); return;}
    const total = g.index?.count ?? g.attributes.position.count;
    if (g.drawRange.start !== 0 || (Number.isFinite(g.drawRange.count) && g.drawRange.count !== total) || total % 3) {skip('partialDrawRange'); return;}
    if (Object.values(g.attributes).some(a => a.isInterleavedBufferAttribute || a.isInstancedBufferAttribute)) {skip('specialAttributes'); return;}
    if (!(g.attributes.position.array instanceof Float32Array || g.attributes.position.array instanceof Float64Array)) {skip('quantizedPosition'); return;}
    if (!materialIds.has(m)) materialIds.set(m, materialIds.size);
    // Attribute compatibility and layers additionally separate otherwise identical
    // render groups, so a single incompatible primitive does not poison the batch.
    const key = JSON.stringify([materialIds.get(m), o.userData.category ?? null, o.visible,
      o.castShadow, o.receiveShadow, o.renderOrder, o.layers.mask, signature(g)]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  function reverseWinding(geometry) {
    const index = geometry.index;
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const b = index.getX(i + 1); index.setX(i + 1, index.getX(i + 2)); index.setX(i + 2, b);
      }
    } else {
      for (const a of Object.values(geometry.attributes)) {
        for (let i = 0; i < a.count; i += 3) {
          for (let j = 0; j < a.itemSize; j++) {
            const b = a.array[(i + 1) * a.itemSize + j];
            a.array[(i + 1) * a.itemSize + j] = a.array[(i + 2) * a.itemSize + j];
            a.array[(i + 2) * a.itemSize + j] = b;
          }
        }
      }
    }
    const tangent = geometry.attributes.tangent;
    if (tangent) for (let i = 0; i < tangent.count; i++) tangent.setW(i, -tangent.getW(i));
  }
  for (const sources of groups.values()) {
    if (sources.length < 2) {skip('singleton'); continue;}
    const copies = [];
    let mergedGeometry = null;
    try {
      let expectedTriangles = 0;
      for (const source of sources) {
        const transform = new THREE.Matrix4().multiplyMatrices(modelInverse, source.matrixWorld);
        const determinant = transform.determinant();
        if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) throw new Error('Singular/nonfinite mesh transform.');
        const copy = source.geometry.clone(); copies.push(copy);
        copy.applyMatrix4(transform);
        if (determinant < 0) reverseWinding(copy);
        expectedTriangles += (copy.index?.count ?? copy.attributes.position.count) / 3;
      }
      mergedGeometry = mergeGeometries(copies, false);
      if (!mergedGeometry) throw new Error('mergeGeometries rejected this group.');
      const actualTriangles = (mergedGeometry.index?.count ?? mergedGeometry.attributes.position.count) / 3;
      if (actualTriangles !== expectedTriangles) throw new Error('Triangle count changed; original group retained.');
      mergedGeometry.computeBoundingBox(); mergedGeometry.computeBoundingSphere();
      const b = mergedGeometry.boundingBox;
      if (![b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z].every(Number.isFinite)) throw new Error('Nonfinite merged bounds.');
      const first = sources[0], merged = new THREE.Mesh(mergedGeometry, first.material);
      merged.name = 'Batched static · ' + (first.userData.category || 'mesh') + ' · ' + stats.mergedGroups;
      merged.userData = {category: first.userData.category, optimizedStatic: true,
        sourceCount: sources.length, sourceNames: sources.map(o => o.name)};
      merged.visible = first.visible; merged.castShadow = first.castShadow;
      merged.receiveShadow = first.receiveShadow; merged.renderOrder = first.renderOrder;
      merged.layers.mask = first.layers.mask;
      // Geometry is already in model-local coordinates; the batch stays identity.
      model.add(merged);
      for (const source of sources) source.removeFromParent();
      stats.mergedGroups++; stats.mergedSourceMeshes += sources.length;
      mergedGeometry = null; // now owned by the live merged Mesh
    } catch (error) {
      mergedGeometry?.dispose();
      stats.failedGroups.push({count: sources.length, category: sources[0].userData.category,
        reason: String(error?.message || error)});
    } finally {
      copies.forEach(g => g.dispose());
    }
  }
  model.updateWorldMatrix(true, true);
  stats.after = count();
  stats.triangles = {before: before.triangles, after: stats.after.triangles,
    unchanged: before.triangles === stats.after.triangles};
  const afterBounds = new THREE.Box3().setFromObject(model, true);
  if (!beforeBounds.isEmpty() && !afterBounds.isEmpty()) {
    stats.boundsMaxDelta = Math.max(...['x','y','z'].flatMap(axis => [
      Math.abs(beforeBounds.min[axis] - afterBounds.min[axis]),
      Math.abs(beforeBounds.max[axis] - afterBounds.max[axis])
    ]));
  }
  return stats;
}
