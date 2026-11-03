# NEUROATLAS 3.0 — anatomy asset attribution

## Files and permission
`brain.glb` and `manifest.json` were copied unchanged from Brain Project,
https://github.com/itayinbarr/brainproject/tree/2929e94f521a8ddceab26bc100a98dc06b0da060/brain-atlas/models
Commit: 2929e94f521a8ddceab26bc100a98dc06b0da060. Retrieved 2026-11-03.
Model SHA-256: 76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453.

Assets and derived metadata: **Creative Commons Attribution-ShareAlike 4.0 International**.
https://creativecommons.org/licenses/by-sa/4.0/
Full legal text: ../licenses/CC-BY-SA-4.0.txt.
Upstream licence and attribution: UPSTREAM-LICENSE.txt (retained in full).
Redistribution and adaptation are permitted, including commercial use, provided
attribution, licence links, change notices and ShareAlike obligations are preserved.
No endorsement by the original authors is implied.

## Credit chain
- Brain Project, © 2026 Itay Inbar: browser export, anatomical metadata and additional registered structures.
- Z-Anatomy, Gauthier Kervyn and contributors: https://www.z-anatomy.com/ and https://github.com/Z-Anatomy
- BodyParts3D / Anatomography, © The Database Center for Life Science (DBCLS): https://lifesciencedb.jp/bp3d/
- CIT168 subcortical atlas, Pauli, Nili & Tyszka 2018, CC BY 4.0: https://osf.io/jkzwp/
- CIT168 amygdala atlas, Tyszka & Pauli 2016, CC BY-SA 4.0: https://osf.io/hksa6/
- Najdenovska et al. 2018 thalamic atlas, CC BY-SA 4.0: https://doi.org/10.5281/zenodo.1405484
- Neudorfer et al. 2020 hypothalamus atlas, CC BY 4.0: https://doi.org/10.5281/zenodo.3942115
- HCP1065 white matter tract templates: source provenance described by Brain Project's registration documentation and repository. Retained upstream asset licence governs this bundled derivative.

## Changes made by NEUROATLAS
No changes to GLB bytes or manifest. Display materials, illumination, selection
and visibility controls are applied at runtime by our viewer. These adaptations
of the anatomy's visual presentation and any derived anatomy metadata remain
CC BY-SA 4.0. Viewer source is separate from the third-party anatomy assets.

## Accuracy and realism
437 separate named meshes; detailed gross anatomical surfaces, no photographic
texture maps. Not a photogrammetric specimen or patient-specific reconstruction.
Some fine nuclei and tracts are approximate registrations from separate atlases;
upstream reports approximately 7 mm held-out registration error for nuclei.
See REGISTRATION.md. The source hierarchy may contain imperfect categorization;
NEUROATLAS maps the ten teaching regions by explicit hierarchy and names, not
by arbitrary spatial boxes. No claim of independent anatomical certification.

## Runtime dependencies
Three.js (MIT): ../licenses/THREE-LICENSE.txt.
Google Draco (Apache 2.0): ../licenses/DRACO-LICENSE.txt.
All geometry, metadata and Draco decoders are hosted with the site; no runtime CDN.

HCP tractography credit: Fang-Cheng Yeh (2022), Population-based tract-to-region
connectome of the human brain and its hierarchical topology, Nature Communications
13, 4933. https://doi.org/10.1038/s41467-022-32595-4
The averaged tract atlas is CC BY-SA 4.0:
https://github.com/data-others/atlas/releases/tag/hcp1065
Underlying imaging: Human Connectome Project, WU-Minn Consortium (David Van Essen
and Kamil Ugurbil), supported by NIH Blueprint grant 1U54MH091657 and the McDonnell
Center for Systems Neuroscience at Washington University.
