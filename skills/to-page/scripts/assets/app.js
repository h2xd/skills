// to-page: draft, save and copy. Every call that needs a user gesture is the
// first call in its own click handler, with no await before it.
(() => {
  const meta = JSON.parse(document.getElementById("meta").textContent)
  const form = document.getElementById("page")
  const result = document.getElementById("result")
  const label = document.getElementById("result-label")
  const out = document.getElementById("out")
  const copy = document.getElementById("copy")
  // In Chrome and WebKit every file:// page shares one storage, so key by path.
  const key = "to-page:" + location.pathname
  const store = (run) => {
    try {
      return run(localStorage)
    } catch {
      return null
    }
  }

  // Fills the form from [name, value] pairs, and folds each single-pick list with a pick.
  // A value is a list for the picks of a multi decision.
  const fill = (pairs) => {
    for (const [name, value] of pairs) {
      for (const one of [value].flat()) {
        const field = [...form.querySelectorAll(`[name="${name}"]`)].find((input) => input.type !== "radio" && input.type !== "checkbox" || input.value === one || name.endsWith(".done"))
        if (field?.type === "radio" || field?.type === "checkbox") field.checked = true
        else if (field) field.value = one
      }
    }
    for (const input of form.querySelectorAll(".opts [type=radio]:checked")) {
      if (!input.defaultChecked) input.closest(".opts").classList.add("folded")
    }
  }
  const draft = store((s) => s.getItem(key))
  if (draft) fill(JSON.parse(draft))
  // A pick folds the other options away. A click on the folded pick opens them again.
  // The label click comes first, then the browser clicks the input: fold on that one.
  form.addEventListener("click", (event) => {
    const opts = event.target.closest(".opts")
    if (!opts) return
    if (opts.classList.contains("folded")) {
      event.preventDefault()
      opts.classList.remove("folded")
    } else if (event.target.matches("[type=radio]")) opts.classList.add("folded")
  })
  form.addEventListener("input", () => store((s) => s.setItem(key, JSON.stringify([...new FormData(form)]))))

  const collect = () => {
    const answers = {}
    for (const [name, raw] of new FormData(form)) {
      const value = raw.trim()
      if (!value) continue
      const at = name.lastIndexOf(".")
      const id = name.slice(0, at)
      const field = name.slice(at + 1)
      const answer = (answers[id] ??= {})
      if (field === "done") answer.done = true
      else if (form.querySelector(`[name="${name}"][type=checkbox]`)) (answer[field] ??= []).push(value)
      else answer[field] = value
    }
    return { t: meta.t, id: meta.id, form: meta.form, saved: new Date().toISOString(), answers }
  }

  const show = (text, value) => {
    label.textContent = text
    out.value = value
    out.hidden = copy.hidden = false
    out.rows = Math.min(8, value.split("\n").length + 1)
    result.hidden = false
    store((s) => s.removeItem(key))
  }

  const folder = decodeURIComponent(location.pathname.replace(/[^/]*$/, ""))
  const served = location.protocol.startsWith("http")
  // The server names each newer page in the folder, such as the next round.
  if (served && window.EventSource) {
    new EventSource("/events").onmessage = (event) => {
      if (event.data !== location.pathname) location.assign(event.data)
    }
  }
  const save = document.getElementById("save")
  if (served) save.textContent = "Submit answers"
  // Saved answers come back into the form, so a reload never looks empty.
  // A submit after that replaces them on purpose.
  let replace = false
  if (served) {
    fetch(meta.file)
      .then((response) => (response.ok ? response.json() : null))
      .then((saved) => {
        if (saved?.form !== meta.form) return
        if (!draft) fill(Object.entries(saved.answers).flatMap(([id, answer]) => Object.entries(answer).map(([field, value]) => [`${id}.${field}`, value])))
        replace = true
        save.textContent = "Replace answers"
        const note = document.getElementById("saved")
        note.textContent = `Submitted ${new Date(saved.saved).toLocaleString()}. Submit again to replace.`
        note.hidden = false
      })
      .catch(() => {})
  }

  const download = (json) => {
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([json], { type: "application/json" }))
    link.download = meta.file
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    show("Downloaded. Copy this and paste it to the agent:", json)
  }

  // Submit shows the answers for a last check. The save runs from the confirm click,
  // so the picker still gets the user gesture it needs.
  const dialog = document.getElementById("confirm")
  const review = document.getElementById("review")
  const text = (node) =>
    [...(node?.childNodes ?? [])].filter((n) => !n.classList?.contains("badge") && !n.classList?.contains("id")).map((n) => n.textContent).join("").trim()
  const line = (tag, value, kind) => {
    const element = document.createElement(tag)
    element.textContent = value
    if (kind) element.className = kind
    return element
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault()
    const answers = collect().answers
    review.replaceChildren(
      ...[...form.querySelectorAll(".item[id]")].map((item) => {
        const { done, note } = answers[item.id] ?? {}
        const picks = [...item.querySelectorAll(".opts input:checked")].map((pick) => text(pick.closest(".opt").querySelector(".opt-label")))
        const shown = picks.length ? picks.join(", ") : done ? "Done" : note
        const entry = document.createElement("li")
        entry.append(line("b", item.id + " "), text(item.querySelector("legend, .item-title")), document.createElement("br"))
        entry.append(shown ? line("b", shown, "pick") : line("span", "No answer", "missing"))
        if (note && shown !== note) entry.append(line("i", " · " + note))
        return entry
      }),
    )
    dialog.showModal()
  })
  document.getElementById("back").addEventListener("click", () => dialog.close())

  document.getElementById("send").addEventListener("click", () => {
    const json = JSON.stringify(collect())
    if (!served && window.showSaveFilePicker) {
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
      return dialog.close()
    }
    dialog.close()
    if (!served) return download(json)
    // Served by `to-page serve`: the server writes the file next to the form.
    save.disabled = true
    fetch(meta.file + (replace ? "?replace=1" : ""), { method: "POST", headers: { "content-type": "application/json" }, body: json })
      .then(async (response) => {
        // 409: the form changed, or someone else submitted first. Keep the draft and say so.
        if (response.status === 409) {
          save.disabled = false
          label.textContent = "Not submitted. " + (await response.text())
          out.hidden = copy.hidden = true
          return (result.hidden = false)
        }
        if (!response.ok) throw new Error(await response.text())
        show("If the agent does not answer, paste it this line:", "Read the answers: " + (await response.json()).path)
        document.getElementById("working").hidden = false
        save.textContent = "Submitted"
      })
      .catch(() => ((save.disabled = false), download(json)))
  })

  copy.addEventListener("click", (event) => {
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
