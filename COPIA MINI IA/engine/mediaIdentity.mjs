// Assinaturas expiram; parâmetros que identificam o conteúdo permanecem na chave.
export function canonicalMediaUrl(value='') {
  try {
    const u=new URL(String(value));u.hash='';
    for(const key of [...u.searchParams.keys()])if(/^(?:token|signature|sig|expires|expiry|policy|key-pair-id|x-amz-.+|x-goog-.+)$/i.test(key))u.searchParams.delete(key);
    u.searchParams.sort();return u.toString();
  } catch { return String(value||''); }
}
