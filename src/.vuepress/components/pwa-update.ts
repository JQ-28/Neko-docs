const CARD_SELECTOR = ".neko-update-card";
const POLL_INTERVAL_MS = 1000;
const POLL_MAX_TIMES = 30;

function showUpdateCard(worker: ServiceWorker): void {
  if (document.querySelector(CARD_SELECTOR)) return;
  const card = document.createElement("div");
  card.className = "neko-update-card";

  const text = document.createElement("span");
  text.className = "neko-update-card-text";
  text.textContent = "发现新版本";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "neko-update-card-button";
  button.innerHTML =
    '<span class="neko-update-card-spinner"><span class="neko-update-card-dot"></span><span class="neko-update-card-dot"></span><span class="neko-update-card-dot"></span></span>刷新';
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

function showWaitingCard(registration: ServiceWorkerRegistration): boolean {
  if (!registration.waiting || !navigator.serviceWorker.controller) return false;
  showUpdateCard(registration.waiting);
  return true;
}

function watchInstalling(installing: ServiceWorker | null): void {
  if (!installing) return;
  const onStateChange = (): void => {
    if (installing.state === "installed" && navigator.serviceWorker.controller) {
      showUpdateCard(installing);
    }
  };
  installing.addEventListener("statechange", onStateChange);
  // 挂监听时可能已装完（statechange 已发过），立即查一次当前状态
  onStateChange();
}

function pollWaitingUpdate(registration: ServiceWorkerRegistration): void {
  let polls = 0;
  const timer = window.setInterval(() => {
    polls += 1;
    if (showWaitingCard(registration) || polls >= POLL_MAX_TIMES) {
      window.clearInterval(timer);
    }
  }, POLL_INTERVAL_MS);
}

export function setupPwaUpdate(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .getRegistration()
    .then((registration) => {
      if (!registration) return;
      // 上次访问装好但未接管的新版本还在排队，刷新后立刻弹卡
      if (showWaitingCard(registration)) return;
      registration.addEventListener("updatefound", () =>
        watchInstalling(registration.installing)
      );
      registration
        .update()
        .then(() => {
          // 安装快于事件派发时，检查完成后再兜底查一次
          if (!showWaitingCard(registration)) {
            watchInstalling(registration.installing);
          }
        })
        .catch(() => {});
      pollWaitingUpdate(registration);
    })
    .catch(() => {});
}
