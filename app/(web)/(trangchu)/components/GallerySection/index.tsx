export default function GallerySection() {
  return (
    <section id="gallery" className="gallery section">
      <div className="container section-title">
        <h2>Gallery</h2>
        <p>Some photos from Our Restaurant</p>
      </div>

      <div className="container-fluid">
        <div className="row g-0">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="col-lg-3 col-md-4">
              <div className="gallery-item">
                <a href="#" className="glightbox">
                  <img
                    src={`/img/gallery/gallery-${idx + 1}.jpg`}
                    alt=""
                    className="img-fluid"
                  />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
