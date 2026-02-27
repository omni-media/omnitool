
export async function loadVideo(url: string) {
	return fetch(url)
		.then(response => response.blob())
}

