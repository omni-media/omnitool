
import {template, html, socialCard} from "@e280/scute"

const title = "omnitool"
const domain = "omnitool.omniclip.app"
const favicon = "/assets/favicon.png"

export default template(import.meta.url, async orb => html`
	<!doctype html>
	<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width,initial-scale=1">
		<meta name="darkreader-lock">
		<style>@layer base{html{background:#000}}</style>
		<title>${title}</title>
		<link rel="stylesheet" href="${orb.hashurl("demo/demo.css")}">
		<script type="module" src="${orb.hashurl("tests.bundle.min.js")}"></script>
		${socialCard({
		title,
		description: "video processing toolkit",
		themeColor: "#3cff9c",
		siteName: domain,
		image: `https://${domain}${favicon}`,
		})}
	</head>
	<body></body>
	</html>
`)

