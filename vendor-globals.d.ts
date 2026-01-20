export {}

declare global {
  interface Window {
    imagesLoaded?: (element: Element | string, callback?: () => void) => void

    Isotope?: new (
      element: Element,
      options?: {
        itemSelector?: string
        layoutMode?: string
        filter?: string
        sortBy?: string
      },
    ) => {
      arrange: (options?: { filter?: string }) => void
    }

    Swiper?: new (el: Element | string, options?: any) => any

    GLightbox?: (options?: any) => any

    AOS?: {
      init: (options?: any) => void
      refresh?: () => void
      refreshHard?: () => void
    }
  }
}
