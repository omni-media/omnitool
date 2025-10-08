
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
		<link href="https://fonts.googleapis.com/css2?family=Share+Tech&display=swap" rel="stylesheet">
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
			<h1>Omnitool <small>v${orb.packageVersion()}</small></h1>
			<button class=fetch>fetch</button>
			<input type="file" class="file-input">
			<div class=results></div>
			<div class=filmstrip-demo>
				<label for="viewable-range">viewable range:</label>
				<input type="range" min="0" max="100" step="1" value="10" class="range" id="viewable-range" name="viewable-range">
				<div class="range-view"></div>
				<label for="range-size">viewable range size:</label>
				<input type="range" class="range-size" min="0.1" max="10" step="0.1" value="0.5" id="range-size" name="range-size">
				<label for="frequency">frequency:</label>
				<input type="range" class="frequency" min="0.1" max="120" step="0.1" value="10" id="frequency" name="frequency">
				<div class="frequency-view">10 (fps)</div>
				<div id=filmstrip></div>
			</div>
			<div class=waveform-demo>
				<label for="width">width:</label>
				<input class="width" id="width" name="width" type="range" min="100" max="1000000" value="1000" />
			</div>
			<div class=player>
				<input class="seek" type="number" min="0">
				<button class=play>play</button>
				<button class=stop>stop</button>
			</div>
		</section>
	`,
}))

