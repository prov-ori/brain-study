import fs from "node:fs/promises";
import validator from "gltf-validator";
import draco3d from "draco3dgltf";
const b = await fs.readFile(
  new URL("../public/models/brain.glb", import.meta.url),
);
const report = await validator.validateBytes(new Uint8Array(b), {
  uri: "brain.glb",
});
console.log(
  "glTF validation:",
  JSON.stringify({
    errors: report.issues.numErrors,
    warnings: report.issues.numWarnings,
    infos: report.issues.numInfos,
    notes: report.issues.messages.filter(
      (m) => m.severity < 2 || m.code === "UNSUPPORTED_EXTENSION",
    ),
  }),
);
if (report.issues.numErrors) process.exitCode = 1;
const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
const binOffset = 20 + b.readUInt32LE(12) + 8;
const draco = await draco3d.createDecoderModule({});
const decoder = new draco.Decoder();
let triangles = 0,
  vertices = 0;
for (const mesh of json.meshes)
  for (const primitive of mesh.primitives) {
    const e = primitive.extensions?.KHR_draco_mesh_compression;
    if (!e) throw new Error("Unexpected uncompressed mesh");
    const view = json.bufferViews[e.bufferView];
    const bytes = b.subarray(
      binOffset + (view.byteOffset || 0),
      binOffset + (view.byteOffset || 0) + view.byteLength,
    );
    const buffer = new draco.DecoderBuffer();
    buffer.Init(new Int8Array(bytes), bytes.length);
    const geometry = new draco.Mesh();
    const result = decoder.DecodeBufferToMesh(buffer, geometry);
    if (
      !result.ok() ||
      geometry.num_points() === 0 ||
      geometry.num_faces() === 0
    )
      throw new Error("Invalid mesh " + mesh.name);
    triangles += geometry.num_faces();
    vertices += geometry.num_points();
    const attribute = decoder.GetAttributeByUniqueId(
      geometry,
      e.attributes.POSITION,
    );
    const positions = new draco.DracoFloat32Array();
    decoder.GetAttributeFloatForAllPoints(geometry, attribute, positions);
    for (let i = 0; i < positions.size(); i++)
      if (!Number.isFinite(positions.GetValue(i)))
        throw new Error("Non-finite vertex");
    draco.destroy(positions);
    draco.destroy(geometry);
    draco.destroy(buffer);
  }
draco.destroy(decoder);
console.log(
  JSON.stringify({
    meshes: json.meshes.length,
    triangles,
    vertices,
    bytes: b.length,
  }),
);
