import "@benev/slate/x/node.js"
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
			<style>${unsanitized(await read_file("x/style.css"))}</style>
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
				// wip
				devModulePath: await path.version.root("driver/example.js"),
				prodModulePath: await path.version.root("driver/example.js"),
				importmapContent: await read_file("x/importmap.json"),
			})}
		`,
		body: html`
			<section>
				<h1>Omnitool</h1>
				<input type="file" class="file-input" accept="image/*, video/*, .mp3">
			</section>
		`,
	})
})
