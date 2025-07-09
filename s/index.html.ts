
import {template, html, easypage, headScripts, git_commit_hash, read_file, unsanitized, renderSocialCard} from "@benev/turtle"

const domain = "github.io"
const favicon = "/assets/e.png"

export default template(async basic => {
	const path = basic.path(import.meta.url)
	const hash = await git_commit_hash()

	return easypage({
		path,
		dark: true,
		title: "e280",
		head: html`
			<link rel="icon" href="${favicon}"/>
			<style>${unsanitized(await read_file("x/demo/demo.css"))}</style>
			<meta data-commit-hash="${hash}"/>

			<link rel="preconnect" href="https://fonts.googleapis.com">
			<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
			<link href="https://fonts.googleapis.com/css2?family=Share+Tech&display=swap" rel="stylesheet">

			${renderSocialCard({
				themeColor: "#3cff9c",
				siteName: "omnitool.com",
				title: "e280",
				description: "video processing toolkit",
				image: `https://${domain}${favicon}`,
				url: `https://${domain}/`,
			})}

			${headScripts({
				devModulePath: await path.version.root("demo/demo.bundle.js"),
				prodModulePath: await path.version.root("demo/demo.bundle.min.js"),
				importmapContent: await read_file("x/importmap.json"),
			})}
		`,
		body: html`
			<section>
				<h1>Omnitool</h1>
				<button class=fetch>fetch</button>
				<button class="import">import</button>
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
			</section>
		`,
	})
})

