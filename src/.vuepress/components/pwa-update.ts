function showUpdateCard(worker: ServiceWorker): void {
  if (document.querySelector(".neko-update-card")) return;
  const card = document.createElement("div");
  card.className = "neko-update-card";

  const text = document.createElement("span");
  text.className = "neko-update-card-text";
  text.textContent = "发现新版本";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "neko-update-card-button";
  button.textContent = "";
  button.innerHTML = '<span class="neko-update-card-icon">↻</span>刷新';
  button.addEventListener("click", () => {
    if (button.classList.contains("is-updating")) return;
    button.classList.add("is-updating");
    worker.postMessage({ type: "SKIP_WAITING" });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  });

  card.append(text, button);
  document.body.appendChild(card);
}

function watchInstalling(installing: ServiceWorker | null): void {
  if (!installing) return;
  installing.addEventListener("statechange", () => {
    // installed 且页面已被旧 SW 控制才意味着「有新版本待接管」
    if (installing.state === "installed" && navigator.serviceWorker.controller) {
      showUpdateCard(installing);
    }
  });
}

export function setupPwaUpdate(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .getRegistration()
    .then((registration) => {
      if (!registration) return;
      // 上次访问时装好但未接管的新版本还在排队，刷新后立刻弹卡
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateCard(registration.waiting);
        return;
      }
      registration.addEventListener("updatefound", () =>
        watchInstalling(registration.installing)
      );
      // 不等 window load，立即触发一次更新检查
      registration.update().catch(() => {});
    })
    .catch(() => {});
}
