export default function ChefsSection() {
  return (
    <section id="chefs" className="chefs section">
      <div className="container section-title">
        <h2>Team</h2>
        <p>Our Professional Chefs</p>
      </div>

      <div className="container">
        <div className="row gy-4">
          {['1', '2', '3'].map((n) => (
            <div key={n} className="col-lg-4">
              <div className="member">
                <img
                  src={`/img/chefs/chefs-${n}.jpg`}
                  className="img-fluid"
                  alt=""
                />
                <div className="member-info">
                  <div className="member-info-content">
                    <h4>Chef {n}</h4>
                    <span>Master Chef</span>
                  </div>
                  <div className="social">
                    <a href="#">
                      <i className="bi bi-twitter-x"></i>
                    </a>
                    <a href="#">
                      <i className="bi bi-facebook"></i>
                    </a>
                    <a href="#">
                      <i className="bi bi-instagram"></i>
                    </a>
                    <a href="#">
                      <i className="bi bi-linkedin"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
