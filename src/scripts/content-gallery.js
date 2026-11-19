document.querySelectorAll("[data-content-gallery]").forEach((gallery) => {
  const track = gallery.querySelector(":scope > div");
  const images = track ? [...track.querySelectorAll(":scope > img")] : [];
  if (!track || !images.length) return;

  let index = 0;
  let suppressClick = false;
  const createButton = (label, text, className) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.className = className;
    button.textContent = text;
    return button;
  };
  const stage = document.createElement("div");
  stage.className = "gallery-stage";
  const imageButton = createButton("Ampliar foto", "", "gallery-image-button");
  const previous = createButton("Foto anterior", "‹", "gallery-arrow gallery-arrow-previous");
  const next = createButton("Próxima foto", "›", "gallery-arrow gallery-arrow-next");
  track.before(stage);
  imageButton.append(track);
  stage.append(imageButton, previous, next);

  const indicators = document.createElement("div");
  indicators.className = "gallery-indicators";
  indicators.setAttribute("role", "group");
  indicators.setAttribute("aria-label", "Selecionar foto");
  const dots = images.map((_, position) => {
    const dot = createButton(`Ir para foto ${position + 1}`, "", "gallery-dot");
    dot.addEventListener("click", () => show(position));
    indicators.append(dot);
    return dot;
  });
  const status = document.createElement("span");
  status.className = "sr-only";
  status.setAttribute("role", "status");
  stage.after(indicators, status);

  const dialog = document.createElement("dialog");
  dialog.className = "gallery-dialog";
  dialog.setAttribute("aria-label", "Foto ampliada");
  const close = createButton("Fechar foto ampliada", "×", "gallery-close");
  const enlarged = document.createElement("img");
  const dialogViewport = document.createElement("div");
  dialogViewport.className = "gallery-dialog-viewport";
  dialogViewport.append(enlarged);
  const dialogPrevious = createButton("Foto anterior", "‹", "gallery-arrow gallery-arrow-previous");
  const dialogNext = createButton("Próxima foto", "›", "gallery-arrow gallery-arrow-next");
  const dialogStatus = document.createElement("p");
  dialogStatus.className = "gallery-dialog-status";
  dialogStatus.setAttribute("role", "status");
  dialog.append(close, dialogViewport, dialogPrevious, dialogNext, dialogStatus);
  document.body.append(dialog);

  function show(position) {
    index = Math.max(0, Math.min(images.length - 1, position));
    images.forEach((image, imageIndex) => { image.hidden = imageIndex !== index; });
    dots.forEach((dot, dotIndex) => {
      if (dotIndex === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    previous.disabled = dialogPrevious.disabled = index === 0;
    next.disabled = dialogNext.disabled = index === images.length - 1;
    status.textContent = dialogStatus.textContent = `Foto ${index + 1} de ${images.length}`;
    enlarged.src = images[index].currentSrc || images[index].src;
    enlarged.alt = images[index].alt;
  }
  previous.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  dialogPrevious.addEventListener("click", () => show(index - 1));
  dialogNext.addEventListener("click", () => show(index + 1));
  imageButton.addEventListener("click", () => {
    if (suppressClick) { suppressClick = false; return; }
    dialog.showModal();
    close.focus();
  });
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => imageButton.focus());
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); show(index - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); show(index + 1); }
  });
  for (const [surface, viewport] of [[imageButton, track], [dialogViewport, dialogViewport]]) {
    let touchStart = null;
    let drag = null;
    const clearDrag = () => {
      if (!drag) return;
      drag.image.style.transform = "";
      drag.image.style.transition = "";
      drag.preview?.remove();
      drag = null;
    };
    surface.addEventListener("touchstart", (event) => {
      if (event.touches.length === 1) {
        clearDrag();
        touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }
    }, { passive: true });
    surface.addEventListener("touchmove", (event) => {
      if (!touchStart || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - touchStart.x;
      const dy = event.touches[0].clientY - touchStart.y;
      if (!drag && (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy))) return;
      const target = index + (dx < 0 ? 1 : -1);
      const validTarget = target >= 0 && target < images.length;
      if (!drag || drag.target !== target) {
        clearDrag();
        const image = surface === imageButton ? images[index] : enlarged;
        const preview = validTarget ? image.cloneNode(false) : null;
        if (preview) {
          preview.src = images[target].currentSrc || images[target].src;
          preview.alt = "";
          preview.setAttribute("aria-hidden", "true");
          preview.setAttribute("data-gallery-drag-preview", "");
          viewport.append(preview);
        }
        drag = { image, preview, target };
      }
      const width = viewport.clientWidth;
      const distance = validTarget ? Math.max(-width, Math.min(width, dx)) : dx * 0.2;
      drag.image.style.transform = `translateX(${distance}px)`;
      if (drag.preview) drag.preview.style.transform = `translateX(${distance + (dx < 0 ? width : -width)}px)`;
    }, { passive: true });
    surface.addEventListener("touchend", (event) => {
      if (!touchStart || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      const swipe = Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy);
      const target = index + (dx < 0 ? 1 : -1);
      const change = swipe && target >= 0 && target < images.length;
      if (Math.abs(dx) >= 10 && Math.abs(dx) > Math.abs(dy) && surface === imageButton) {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 400);
      }
      if (!drag) { if (change) show(target); return; }
      const activeDrag = drag;
      const width = viewport.clientWidth;
      const finalDistance = change ? (dx < 0 ? -width : width) : 0;
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180;
      activeDrag.image.style.transition = duration ? "transform 180ms ease-out" : "none";
      activeDrag.image.style.transform = `translateX(${finalDistance}px)`;
      if (activeDrag.preview) {
        activeDrag.preview.style.transition = duration ? "transform 180ms ease-out" : "none";
        activeDrag.preview.style.transform = `translateX(${finalDistance + (dx < 0 ? width : -width)}px)`;
      }
      setTimeout(() => {
        if (drag !== activeDrag) return;
        clearDrag();
        if (change) show(target);
      }, duration);
    }, { passive: true });
    surface.addEventListener("touchcancel", () => { touchStart = null; clearDrag(); }, { passive: true });
  }
  gallery.classList.add("gallery-enhanced");
  show(0);
});
