import { nextTick, onMounted, onUnmounted, ref, type Ref } from 'vue';

/**
 * 表格高度 = panel 的 flex 分配高度 − 分页高度。
 * 只监听外部容器，不监听 panel / 表格，避免反馈循环。
 */
export function useDataTableHeight(panelRef: Ref<HTMLElement | undefined>) {
  const tableHeight = ref<number>();

  let observer: ResizeObserver | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  function measure(): number {
    const panel = panelRef.value;
    if (!panel) return 0;

    const footer = (panel.querySelector('.page-table-footer') || panel.querySelector('.page-table-footer-placeholder')) as HTMLElement | null;
    if (!footer) return 0;
    const footerH = footer.offsetHeight;

    // subtract internal toolbar height (if present) so table doesn't overflow when toolbar exists
    const toolbarInner = panel.querySelector('.data-table-toolbar') as HTMLElement | null;
    const toolbarInnerH = toolbarInner ? toolbarInner.offsetHeight : 0;

    // Prefer bounding-rect based available height: measure distance from panel top to nearest layout container bottom
    const container = panel.closest('.layout-padding-view') || panel.closest('.layout-main') || document.documentElement;
    const panelRect = panel.getBoundingClientRect();
    const containerRect = container instanceof Element ? (container as Element).getBoundingClientRect() : { bottom: window.innerHeight } as DOMRect;

    const available = Math.floor(containerRect.bottom - panelRect.top) - footerH - toolbarInnerH - 8;

    if (available <= footerH + toolbarInnerH + 40) return 0;

    // ensure a sensible minimum height
    return Math.max(Math.floor(available) - 2, 120);
  }

  function update() {
    const panel = panelRef.value;
    const footer = panel?.querySelector('.page-table-footer') as HTMLElement | null;
    const body = panel?.querySelector('.data-table-body') as HTMLElement | null;
    const footerH = footer ? footer.offsetHeight : 45;
    const pad = footerH + 8;
    try {
      if (body) {
        const cur = parseInt(window.getComputedStyle(body).paddingBottom || '0', 10) || 0;
        if (cur !== pad) body.style.paddingBottom = `${pad}px`;
      }
    } catch { }

    const h = measure();
    if (h <= 0) {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(update, 50);
      return;
    }
    clearTimeout(retryTimer);
    if (tableHeight.value === undefined || Math.abs(h - tableHeight.value) >= 2) {
      tableHeight.value = h;
    }
  }

  function bindObservers() {
    observer?.disconnect();
    observer = new ResizeObserver(update);

    const panel = panelRef.value;
    if (!panel) return;

    const pageRoot = panel.parentElement;
    const toolbar = pageRoot?.querySelector('.page-toolbar') as HTMLElement | null;
    const shell = panel.closest('.layout-padding-view') as HTMLElement | null;
    const main = panel.closest('.layout-main') as HTMLElement | null;
    const footer = (panel.querySelector('.page-table-footer') || panel.querySelector('.page-table-footer-placeholder')) as HTMLElement | null;

    for (const el of [main, shell, toolbar, footer]) {
      if (el) observer.observe(el);
    }
    update();
  }

  onMounted(async () => {
    window.addEventListener('resize', update);
    await nextTick();
    requestAnimationFrame(bindObservers);
  });

  onUnmounted(() => {
    observer?.disconnect();
    window.removeEventListener('resize', update);
    clearTimeout(retryTimer);
  });

  return { tableHeight, remeasure: update };
}
