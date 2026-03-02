export {}

declare global {
  interface Window {
    Isotope?: new (
      el: Element,
      options?: {
        itemSelector?: string
        layoutMode?: string
        filter?: string
        sortBy?: string
        getSortData?: Record<string, any>
      },
    ) => { arrange: (opts?: { filter?: string }) => void }

    imagesLoaded?: (el: Element, cb: () => void) => void

    Swiper?: new (el: Element | string, options?: any) => any
    GLightbox?: (opts?: any) => any
    AOS?: { init: (opts?: any) => void; refresh?: () => void }
  }
}
