// to-page: draft, save and copy. Every call that needs a user gesture is the
// first call in its own click handler, with no await before it.
(() => {
  const meta = JSON.parse(document.getElementById("meta").textContent)
  const form = document.getElementById("page")
  const result = document.getElementById("result")
  const label = document.getElementById("result-label")
  const out = document.getElementById("out")
  // In Chrome and WebKit every file:// page shares one storage, so key by path.
  const key = "to-page:" + location.pathname
  const store = (run) => {
    try {
      return run(localStorage)
    } catch {
      return null
    }
  }

  const draft = store((s) => s.getItem(key))
  if (draft) {
    for (const [name, value] of JSON.parse(draft)) {
      const field = form.elements.namedItem(name)
      if (!field) continue
      if (field.type === "checkbox") field.checked = true
      else field.value = value
    }
  }
  form.addEventListener("input", () => store((s) => s.setItem(key, JSON.stringify([...new FormData(form)]))))

  const collect = () => {
    const answers = {}
    for (const [name, raw] of new FormData(form)) {
      const value = raw.trim()
      if (!value) continue
      const at = name.lastIndexOf(".")
      const id = name.slice(0, at)
      const field = name.slice(at + 1)
      ;(answers[id] ??= {})[field] = field === "done" ? true : value
    }
    return { t: meta.t, id: meta.id, form: meta.form, saved: new Date().toISOString(), answers }
  }

  const show = (text, value) => {
    label.textContent = text
    out.value = value
    out.rows = Math.min(8, value.split("\n").length + 1)
    result.hidden = false
    store((s) => s.removeItem(key))
  }

  const folder = decodeURIComponent(location.pathname.replace(/[^/]*$/, ""))

  const download = (json) => {
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([json], { type: "application/json" }))
    link.download = meta.file
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    show("Downloaded. Copy this and paste it to the agent:", json)
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault()
    const json = JSON.stringify(collect())
    // Served by `to-page serve`: the server writes the file next to the form.
    if (location.protocol.startsWith("http")) {
      return fetch(meta.file, { method: "POST", headers: { "content-type": "application/json" }, body: json })
        .then(async (response) => {
          if (!response.ok) throw new Error(await response.text())
          show("Saved. Copy this line and paste it to the agent:", "Read the answers: " + (await response.json()).path)
        })
        .catch(() => download(json))
    }
    if (!window.showSaveFilePicker) return download(json)
    showSaveFilePicker({
      id: "to-page",
      suggestedName: meta.file,
      types: [{ description: "Answers", accept: { "application/json": [".json"] } }],
    })
      .then(async (handle) => {
        const writable = await handle.createWritable()
        await writable.write(json)
        await writable.close()
        show("Saved. Copy this line and paste it to the agent:", "Read the answers: " + folder + handle.name)
      })
      .catch(() => download(json))
  })

  document.getElementById("copy").addEventListener("click", (event) => {
    const button = event.currentTarget
    const fallback = () => {
      out.select()
      document.execCommand("copy")
    }
    const copied = () => (button.textContent = "Copied")
    if (navigator.clipboard) navigator.clipboard.writeText(out.value).then(copied, () => (fallback(), copied()))
    else (fallback(), copied())
  })
})()
