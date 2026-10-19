CASEIB 2026 · MONODOMAIN / BIDOMAIN COMPANION
19 October 2026

Separating Monodomain Propagation and Forward-Problem Effects with Green
Operators in a Finite-Thickness Cardiac Slab
J. L. Rojo-Álvarez, E. Sánchez-Carballo, E. Feito-Casares, B. Trenor,
J. Saiz and F. M. Melgarejo-Meseguer
Universidad Rey Juan Carlos and Universitat Politècnica de València

OPENING THE COMPANION
Open index.html in a modern browser, or serve the static directory with
  python3 -m http.server 8765 --bind 127.0.0.1
and visit http://127.0.0.1:8765/
There is no build step, external JavaScript, remote font, tracker or server API.
Institutional links and contact links open only when selected.

STUDY RESULTS
This view evaluates saved fields from the Gaussian initial-voltage benchmark.
The default modal replay has a 0.05 ms step from 0.25 to 6 ms, giving 116 times.
It evaluates saved coefficients and decay rates without interpolating snapshots
or executing a PDE solver. Six original snapshots at 0.25, 0.5, 1, 2, 4 and 6 ms
remain selectable. The chart retains the original modal/finite-volume samples.
The Gaussian modal and finite-volume experiments share their initial field.
The independent finite-element experiment uses a different 0.2 ms current pulse.
It supports the mechanism but is not a convergence study or pointwise validation.

M/B mean monodomain/bidomain. The recovery operator F is shared within each
conductivity pair. It changes when the conductivity family changes. Recovered
potentials are inside tissue. No torso, conducting bath or active physiology
is simulated. Percentages belong to this passive homogeneous insulated slab.
At 6 ms for unequal ratios, modal contrasts are 1.283191622% for membrane voltage
and 1.41310838% for recovered potential, displayed as 1.28% and 1.41% on the poster.
The contrast uses equally weighted paired samples and a bidomain denominator.
It is not a mass-weighted finite-element spatial norm.

Oblique surfaces use x and z in millimetres as base coordinates. Height and
colour represent potential, not tissue displacement. M/B share camera and fixed
scales. Signed differences use their own explicit scale. Top view is available.
Metrics always use all 121x41 samples. The surface connects fewer samples only
for rendering. Playback takes 10 seconds per cycle, independently of time step.

EXPLORE A MODE
This separate teaching example evaluates an exact single-mode solution with
initial spatial mean 5 mV and cosine amplitude 10 mV. It is not a field from
the Gaussian benchmark. It uses the continuous spatial L2 norm. Its contrast
therefore differs from the study's sampled Gaussian contrast.
Pure modes and proportional conductivities give coincident propagation.
Under unequal anisotropy ratios, excited mixed modes can separate for the
selected local monodomain tensor with directional entries sigma_i*sigma_e /
(sigma_i+sigma_e). The uniform voltage decays with tau=10 ms. It contributes
no extracellular potential under the zero-mean gauge.

For k=(p*pi/L,q*pi/h), a_i=k^T Sigma_i k and a_e=k^T Sigma_e k.
The bidomain symbol is a_i*a_e/(a_i+a_e) and the recovery multiplier is
-a_i/(a_i+a_e). Monodomain uses k^T Sigma_m k. The decay rate is
1/tau + symbol/(beta*Cm), with consistent SI units before conversion to ms.
L=12 mm, h=2 mm, beta=140 /mm and Cm=0.01 microF/mm^2, giving beta*Cm=1400 F/m^3.
The time slider has a 0.01 ms step. No dynamic numerical simulation is launched.

DATA AND SOFTWARE
Data extraction provenance and input hashes are in data/extraction_checks.json.
The coefficient export check is in data/modal_export_checks.json.
data/study.js contains saved fields and original curves. data/modal_basis.js
contains saved coefficients, decay rates, recovery multipliers and fixed bounds.
modal-replay.js evaluates that expansion. model.js evaluates the teaching example.
surface.js renders the common camera. app.js handles controls and charts.
assets/sources.json identifies the institutional marks and their official source.

The authors' full study archive retains the canonical MATLAB/HDF5 results,
scientific solvers, submitted article and technical report. The static companion
is a curated subset and does not redistribute private review material.
Within that archive the read-only exporters are
  tools/export_saved_results.py
  tools/export_modal_basis.py
Their paths are relative to the companion's source directory. They need NumPy
and h5py and read the saved results rather than running the scientific solvers.
The source validation commands in the full archive are
  node caseib/poster_web/tools/check_companion.js
  node caseib/poster_web/tools/check_modal_replay.js
The publication package intentionally contains only the runtime, public notes,
necessary data, provenance and institutional assets.

INSTITUTIONS AND FUNDING
B. Trenor and J. Saiz are with the Centre for Research and Innovation in
Bioengineering (Ci2B), Universitat Politècnica de València. The other authors
are with Universidad Rey Juan Carlos. Institutional marks retain their owners'
rights. Acknowledgements and grant identifiers appear in the companion footer.
Contact: joseluis.rojo@urjc.es

INTERACTIVE CAMERA AND DISPLAY SCALES
The same yaw, pitch and roll apply to M, B and their difference in both views.
Mouse rotation is enabled on arrival. Drag any surface to turn and Shift-drag
to roll. The three sliders remain available. On touch screens, select Enable
rotation in the toolbar beside the plots, then drag with one finger to turn
or move and twist two fingers to combine all three rotations. The plot toolbar
stays visible while scrolling through the fields and shares its state with
the controls above. Both toolbars include Reset view.
Turn drag rotation off to restore normal vertical scrolling over the plots.
Reset view restores yaw -20, pitch 28 and roll 0 degrees, with zoom 100%. It changes neither
the selected field nor time, metrics or playback state. Camera changes redraw
cached fields and do not reevaluate the modal expansion or teaching solution.

The spatial reference is a transparent wire grid at potential zero. Its base
coordinates remain x and z in mm. Height represents potential rather than the
spatial thickness coordinate z. No opaque floor hides negative potential.
M/B use percentages of the initial membrane-voltage peak for both voltage and
recovered extracellular potential. The signed difference explicitly retains
normalized potential relative to that same reference. It is not the percentage
contrast delta_2, whose denominator is the current bidomain field norm.
Voltage limits are [-0.001,0.8] internally, with axis ticks from 0 to 80 percent
and a -0.1 percent lower margin preserving small negative undershoots. The
voltage difference has fixed limits +/-0.0045. Recovered potential uses
+/-0.15 (labelled +/-15 percent of the initial voltage reference), and its
difference +/-0.0007. The independent teaching example retains its mV units.
These limits cover all saved snapshots and the full 0.05 ms modal replay.

The renderer uses indexed triangles and a WebGL depth buffer for arbitrary
orientations, with a software depth-buffer fallback if WebGL is unavailable.
Scalar values are interpolated before colour mapping. There is no lighting
or shading that changes the calibrated colours. The same projected spatial
scale and zero-plane position are used in all three panels. Endpoint labels
are kept readable when an axis is foreshortened. Top view remains available.

In the full study archive, camera and touch checks can be reproduced with
  node caseib/poster_web/tools/check_camera_browser.cjs URL TEMPORARY_OUTPUT
This requires Playwright and Chrome, uses an isolated browser profile and
emulates mobile viewports and touch input. It is not a physical-phone test.

SHARED ZOOM
While rotation is enabled, the mouse wheel zooms all three surfaces together.
On touch screens, enable rotation and pinch with two fingers to zoom. Pinch,
turn and roll can be combined. The plus/minus buttons provide the same action
without a wheel or touch gesture. Zoom is limited to 50–400% and centred on
the common camera, independently of the touched panel. Reset view restores
100% and the initial orientation. Zoom preserves field values, scientific
scales, spatial proportions, time and metrics. Enlarged geometry can leave
the viewport, and labels whose anchors leave it are hidden rather than moved
to misleading coordinate positions. Turn rotation off to scroll normally over
the plots. The flat top view keeps its original behaviour.
