import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { getCategories, getSettings } from "@/lib/storage";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/>
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
      <path d="m10 15 5-3-5-3z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4l11.733 16h4.267l-11.733-16zM4 20l6.768-6.768M20 4l-6.768 6.768"/>
    </svg>
  );
}

export default async function Footer() {
  const [categories, settings] = await Promise.all([getCategories(), getSettings()]);
  const s = settings.socials || {};

  return (
    <footer className="footer">
      <div className="container">
        <div className="footerGrid">
          <div>
            <BrandLogo />
            <p>O que acontece em Goiânia, do seu bairro para a cidade inteira.</p>
            <div className="footerBadge">📍 Goiânia • Goiás</div>

            {/* Redes Sociais */}
            <div className="footerSocialWrap">
              <span className="footerSocialTitle">Siga o Viralizougoiania</span>
              <div className="footerSocialIcons">
                {s.instagram && (
                  <a href={s.instagram} target="_blank" rel="noopener noreferrer" className="socialBtn instagram" aria-label="Instagram">
                    <InstagramIcon /> <span>Instagram</span>
                  </a>
                )}
                {s.whatsapp && (
                  <a href={s.whatsapp} target="_blank" rel="noopener noreferrer" className="socialBtn whatsapp" aria-label="WhatsApp">
                    <WhatsAppIcon /> <span>WhatsApp</span>
                  </a>
                )}
                {s.tiktok && (
                  <a href={s.tiktok} target="_blank" rel="noopener noreferrer" className="socialBtn tiktok" aria-label="TikTok">
                    <TikTokIcon /> <span>TikTok</span>
                  </a>
                )}
                {s.youtube && (
                  <a href={s.youtube} target="_blank" rel="noopener noreferrer" className="socialBtn youtube" aria-label="YouTube">
                    <YouTubeIcon /> <span>YouTube</span>
                  </a>
                )}
                {s.facebook && (
                  <a href={s.facebook} target="_blank" rel="noopener noreferrer" className="socialBtn facebook" aria-label="Facebook">
                    <FacebookIcon /> <span>Facebook</span>
                  </a>
                )}
                {s.twitter && (
                  <a href={s.twitter} target="_blank" rel="noopener noreferrer" className="socialBtn twitter" aria-label="X (Twitter)">
                    <TwitterIcon /> <span>X</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4>Editorias</h4>
            {categories.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/categoria/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </div>

          <div>
            <h4>Viralizougoiania</h4>
            <Link href="/">Página inicial</Link>
            <Link href="/admin">Área dos Funcionários</Link>
            <span className="footerSmall">Portal independente de notícias locais de Goiânia.</span>
          </div>
        </div>

        <div className="footerBottom">
          © {new Date().getFullYear()} Viralizougoiania. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
