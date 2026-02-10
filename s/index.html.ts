
import {ssg, html} from "@e280/scute"

const title = "omnitool"
const domain = "omnitool.omniclip.app"
const favicon = "/assets/favicon.png"

export default ssg.page(import.meta.url, async orb => ({
	title,
	// favicon,
	dark: true,
	css: "demo/demo.css",
	js: "demo/demo.bundle.min.js",

	head: html`
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Share+Tech&family=Space+Grotesk:wght@400;600&display=swap" rel="stylesheet">
	`,

	socialCard: {
		title,
		description: "video processing toolkit",
		themeColor: "#3cff9c",
		siteName: domain,
		image: `https://${domain}${favicon}`,
	},

	body: html`
		<section>
			<header class="hero">
				<div>
					<h1>Omnitool <small>v${orb.packageVersion()}</small></h1>
					<p>Developer demos for decoding, preview, waveform, playback, and export.</p>
				</div>
			</header>

			<div class="demo-grid">
				<article class="demo-card" data-demo="transcode">
					<header>
						<h2>Transcode Test</h2>
						<p>Full decode + composite + encode pipeline.</p>
					</header>
					<div class="demo-controls">
						<input type="file" accept="video/*" />
						<button data-action="run">Run Transcode</button>
					</div>
					<div class="demo-progress">
						<progress class="progress"></progress>
						<span class="status">idle</span>
					</div>
					<div class="demo-preview"></div>
				</article>

				<article class="demo-card" data-demo="filmstrip">
					<header>
						<h2>Filmstrip</h2>
						<p>Thumbnail sampling across a time range.</p>
					</header>
					<div class="demo-controls">
						<input type="file" accept="video/*" />
						<button data-action="run">Generate Filmstrip</button>
					</div>
					<div class="filmstrip-controls">
						<label>viewable range</label>
						<input type="range" min="0" max="100" step="1" value="10" class="range">
						<div class="range-view"></div>
						<label>range size</label>
						<input type="range" class="range-size" min="0.1" max="10" step="0.1" value="0.5">
						<label>frequency</label>
						<input type="range" class="frequency" min="0.1" max="120" step="0.1" value="10">
						<div class="frequency-view">10 (fps)</div>
					</div>
					<div class="filmstrip"></div>
				</article>

				<article class="demo-card" data-demo="waveform">
					<header>
						<h2>Waveform</h2>
						<p>Audio peak rendering with adjustable width.</p>
					</header>
					<div class="demo-controls">
						<input type="file" accept="audio/*,video/*" />
						<button data-action="run">Build Waveform</button>
					</div>
					<div class="waveform-controls">
						<label>width</label>
						<input class="width" type="range" min="100" max="1000000" value="1000" />
					</div>
					<div class="waveform-canvas"></div>
				</article>

				<article class="demo-card" data-demo="playback">
					<header>
						<h2>Timeline Playback</h2>
						<p>Build timeline and run the playback engine.</p>
					</header>
					<div class="demo-controls">
						<input type="file" accept="video/*,audio/*" />
					</div>
					<div class="player-canvas"></div>
					<div class="player">
						<div class="timeline">
							<div class="track">
								<div class="playhead"></div>
							</div>
							<input class="scrub" type="range" min="0" max="0" step="1" value="0">
						</div>
						<div class="timecode">0:00.000 / 0:00.000</div>
						<div class="controls">
							<button class=play disabled>play</button>
							<button class=stop disabled>stop</button>
						</div>
					</div>
				</article>

				<article class="demo-card" data-demo="export">
					<header>
						<h2>Timeline Export</h2>
						<p>Build timeline and export a render.</p>
					</header>
					<div class="demo-controls">
						<input type="file" accept="video/*,audio/*" />
						<button data-action="export" disabled>Export</button>
					</div>
					<div class="demo-progress">
						<progress class="progress"></progress>
						<span class="status">idle</span>
					</div>
					<div class="demo-preview"></div>
				</article>
			</div>

		</section>
	`,
}))

