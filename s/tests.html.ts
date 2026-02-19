
import {ssg, html} from "@e280/scute"

const title = "omnitool"
const domain = "omnitool.omniclip.app"
const favicon = "/assets/favicon.png"

export default ssg.page(import.meta.url, async orb => ({
	title,
	dark: true,
	css: "demo/demo.css",
	js: "tests.bundle.min.js",

	head: html`
	`,

	socialCard: {
		title,
		description: "video processing toolkit",
		themeColor: "#3cff9c",
		siteName: domain,
		image: `https://${domain}${favicon}`,
	},

	body: html`
	`,
}))

