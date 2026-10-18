# ThinkWorld — project page

Source for the project page of **ThinkWorld: World Imagination Reinforces Chain-of-Dynamics Reasoning**.

A static site with no build step and no external dependencies: plain HTML, CSS and JavaScript. All videos and images are stored in the repo (~72 MB, no file over 6 MB).

## Publish with GitHub Pages

1. Push this folder as the root of a repository.
2. Go to **Settings → Pages → Build and deployment**, choose *Deploy from a branch*, then select `main` and `/ (root)`.
3. The site is served at `https://<user>.github.io/<repo>/`. `.nojekyll` is included, so files are served as-is.

To preview locally, open `index.html` in a browser, or run `python3 -m http.server` in this folder and visit <http://localhost:8000>.

## Before release: fill in the placeholders

Search for `TODO(R4)` in `index.html`. Placeholder blocks have a dashed yellow outline (CSS class `placeholder`). Remove the class once a block is filled in.

| What | Where |
|---|---|
| Venue badge | `index.html`: uncomment the `<span class="venue">` line above the title |
| Authors and affiliations | `index.html`, `.authors` / `.affils` |
| Paper, arXiv, Code and Model links | `index.html`, `.links`. Set `href` and remove the `soon` class. |
| BibTeX | `index.html`, `#bib` |
| Teaser video | Drop the file at `static/videos/teaser.mp4`. It replaces the placeholder automatically. Use H.264, ideally under 20 MB, encoded with `-movflags +faststart`. |

## Fonts and colors

The page uses an NVIDIA-style leaf-green palette (vivid greens on a white background with neutral gray panels; lime accents on a dark green-black background in night mode) and the **NVIDIA Sans** typeface, self-hosted from `static/fonts/` (WOFF, regular / italic / medium / bold). All colors are CSS variables at the top of `static/css/style.css`: `:root` for day mode and `html[data-theme="dark"]` for night mode.

The day/night toggle sits in the top-right corner of the nav bar. The first visit follows the visitor's system setting; after that, the choice is remembered in `localStorage`.

NVIDIA Sans is a proprietary NVIDIA typeface. Confirm with the brand team that it may be redistributed in a public repository before pushing `static/fonts/`. If not, delete `static/fonts/`: the CSS tries the locally installed font first and otherwise falls back to Arial, so nothing else needs to change.

## Layout

```
index.html                 page markup (all sections)
static/css/style.css       styles
static/js/main.js          interactive components (players, viewers, charts, tables)
static/js/figures.js       Overview / Method diagrams: menu modules and arrows, edit here
static/js/flow.js          draws the diagram arrows, menu, highlighting and tour
static/js/arch_anim.js     looping data-flow animation through the model in the Method figure
static/js/results.js       every number shown on the page (paper Tables 1–9), edit here
static/js/data_*.js        auto-generated asset manifests (do not edit)
static/images/             figures, diagram photos, future-prediction panels, attention maps, closed-loop frames
static/videos/             real-robot rollouts (top camera), skill composition, demos, data mosaic
tools/build_assets.py      regenerates static/images, static/videos and data_*.js from raw outputs
tools/build_diagram_assets.py  extracts the photos used inside the two diagrams from the PPTX files
tools/build_figures.py     og:image, rendered from the teaser PPTX
tools/build_task_images.py real-robot task photos (in-domain / OOD setups) from the success-rate PPTX
tools/collect_page_assets.py  pulls source rollout videos on the lab server
```

## Interactive figures

The Overview and Method figures are built from page-native objects: HTML boxes, token chips, text and CSS shapes, with arrows drawn as animated SVG paths. Their arrangement follows the paper's teaser and architecture figures. Only photographs, feature maps and the apple/plate illustration are images (`static/images/diagram/`).

A toolbar above each diagram lists its parts (three panels for the Overview, two stages for the Method) next to the tour controls. Selecting a part keeps it lit and dims everything else, with a one-line note below the diagram; "Take the tour" steps through the parts automatically. The panels can be clicked too.

* **Boxes**: plain HTML in `index.html` inside `#flow-teaser` and `#flow-arch`. Any element with `data-node="..."` can be lit by a module or used as an arrow end point. Styles are under "native diagrams" in `style.css`, with one color set per role (`--k-motion-*`, `--k-vision-*`, ...) for day and night.
* **Modules and arrows**: `static/js/figures.js`. Each module lists the `data-node` ids it lights up; each arrow names its two end points, the sides it leaves from and enters, and optional labels (`ℒ_GRPO` renders a subscript), elbow routes, curvature and dashed/loop styles. The fields are documented at the top of the file.
* **Behavior**: `static/js/flow.js`. Arrows are recomputed whenever the layout changes size.
* **Photos** inside the diagrams are extracted from the PPTX files:
  ```bash
  python3 tools/build_diagram_assets.py \
    --teaser ../figure_sources/thinkworld_teaser_blue_v2_final.pptx \
    --arch   ../figure_sources/thinkworld_main_arch_full_blue.pptx
  ```
* The og:image (`static/images/figures/teaser_og.jpg`) is still rendered from the teaser PPTX: `python3 tools/build_figures.py --src ../figure_sources` (needs LibreOffice).
* Real-robot task cards use the photos on slide 1 of `figure_sources/thinkworld_real_sr.pptx`: `python3 tools/build_task_images.py --pptx ../figure_sources/thinkworld_real_sr.pptx`. Tags, dotted ellipses and arrows are drawn by the page (`index.html`, `.tasks`).

## Regenerating assets

The raw research outputs are not part of this repo. To rebuild every derived asset:

```bash
python3 tools/build_assets.py \
  --fig-dir   ~/Downloads/thinkworld_fig \
  --video-dir ~/Desktop/thinkworld_projectpage/figure_videos \
  --samples-dir ~/Downloads/egodex_bcz_sample_videos
# a subset only:
python3 tools/build_assets.py ... --only future_pred,attention
```

Requirements: Python 3.9+, Pillow (with WebP), numpy, `ffmpeg`, and `pdftocairo` (poppler).

Video settings: top camera only, H.264 CRF 28, 854 px wide, no audio, faststart. LaWAM rollouts are stretched 2× (`PLAYBACK_SLOWDOWN`) because they were run with 2× faster inference. The first frame is saved as a WebP poster. Rollouts are stored in real time; playback speed is chosen on the page.

## Content sources

| Page element | Source |
|---|---|
| Overview diagram | Layout of `figure_sources/thinkworld_teaser_blue_v2_final.pptx`, rebuilt natively; photos via `tools/build_diagram_assets.py` |
| Method diagram | Layout of `figure_sources/thinkworld_main_arch_full_blue.pptx`, rebuilt natively; photos via `tools/build_diagram_assets.py` |
| Real-robot task cards | Photos from slide 1 of `figure_sources/thinkworld_real_sr.pptx` via `tools/build_task_images.py` |
| Future-prediction viewer | Panels extracted from the paper PDF: Fig. 5 (YAM, EgoVerse, Bridge) and appendix Fig. 11 (EgoDex, DROID, RoboCOIN, RT-1, BC-Z); see `FP_SOURCES` |
| Attention gallery | `cherrypicked_attention_examples_unfiltered_n24/` (Stage-3 overlays; RoboCOIN 2–3 excluded via `ATTN_EXCLUDE`) |
| Closed-loop viewer | `figure_videos/closed_loop_future_pca/20260920_stage3_2k_long_rollout_post_interaction_suite/visualizations_rowwise_actual_only_pca/simplerenv/` |
| Rollout comparison | `figure_videos/rr_task_pages_videos/` (the episodes used in appendix Fig. 9) |
| Skill composition | `figure_videos/skill_composition/` (one human demo + one rollout per task) |
| Training demos | `figure_videos/training_demos/` |
| Training-data mosaic | `thinkworld_video_examples_2/`, `DROID_RoboCOIN_RT1_representative_60_samples/`; EgoDex and BC-Z tiles cycle through the 4-second sample clips in `egodex_bcz_sample_videos/` (`DATA_SAMPLES`) |
