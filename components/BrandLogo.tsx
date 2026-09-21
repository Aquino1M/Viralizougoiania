import Link from "next/link";

export default function BrandLogo({ admin = false }: { admin?: boolean }) {
  return (
    <Link href={admin ? "/admin" : "/"} className="brandLogo" aria-label="Viralizougoiania">
      <span className="brandMark" aria-hidden="true"><i></i><i></i><i></i></span>
      <span className="brandWords"><b>Viralizou</b><strong>goiania</strong></span>
    </Link>
  );
}
