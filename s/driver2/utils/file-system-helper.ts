export class FileSystemHelper {

	async save(binary: Uint8Array) {
		const handle = await this.#getFileHandle()
		await this.#writeFile(handle, binary)
	}

	async #writeFile(fileHandle: FileSystemFileHandle, contents: Uint8Array) {
		// Support for Chrome 82 and earlier.
			//@ts-ignore
		if (fileHandle.createWriter) {
			//@ts-ignore
			const writer = await fileHandle.createWriter()
			await writer.write(0, contents)
			await writer.close()
			return
		}
		// For Chrome 83 and later.
		const writable = await fileHandle.createWritable()
		await writable.write(contents)
		await writable.close()
	}


	readFile(file: File) {
		if (file.text) {
			return file.text()
		}
		return this.#readFileLegacy(file)
	}

	async #getFileHandle() {
		// For Chrome 86 and later...
		if ('showSaveFilePicker' in window) {
			const handle = await self.showSaveFilePicker({
				suggestedName: 'video.mp4',
				types: [{
					description: 'mp4 video',
					accept: {
						'video/mp4': ['.mp4'],
					},
				}],
			})

			return handle
		}
		//@ts-ignore
		return window.chooseFileSystemEntries()
	}


	#readFileLegacy(file: File) {
		return new Promise((resolve) => {
			const reader = new FileReader()
			reader.addEventListener('loadend', (e) => {
			//@ts-ignore
				const text = e.srcElement.result
				resolve(text)
			})
			reader.readAsText(file)
		})
	}
}
