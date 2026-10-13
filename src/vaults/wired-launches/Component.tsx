"use client";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useFlapSdk } from "@/src/sdk";
import { ExternalLink, IpfsImage } from "@/src/ui";

export default function Component() {
  const { i18n } = useFlapSdk({ chainId: 56 });
  const t = i18n.t;
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [recipientPlatform, setRecipientPlatform] = useState("x");
  const [recipientHandle, setRecipientHandle] = useState("");
  const [pairAsset, setPairAsset] = useState("BNB");
  const [pairs, setPairs] = useState<Array<{ symbol: string; name: string; address: string; category?: string }>>([]);
  const [pairsError, setPairsError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const [launchResult, setLaunchResult] = useState<{ token: string; hash: string } | null>(null);

  const parseResponse = useCallback(async <T,>(response: Response): Promise<T> => {
    const output = await response.json().catch(() => ({})) as { error?: string } & T;
    if (!response.ok) throw new Error(output.error || `Request failed (${response.status})`);
    return output;
  }, []);

  useEffect(() => {
    let active = true;
    fetch("https://wiredup.app/api/pairs/flap", { headers: { accept: "application/json" } })
      .then((response) => parseResponse<Array<{ symbol: string; name: string; address: string; category?: string }>>(response))
      .then((catalog) => {
        if (!active) return;
        const ordered = [...catalog].sort((a, b) => a.symbol === "BNB" ? -1 : b.symbol === "BNB" ? 1 : a.symbol.localeCompare(b.symbol));
        setPairs(ordered);
        setPairsError("");
        setPairAsset((current) => ordered.some((pair) => pair.symbol === current) ? current : "BNB");
      })
      .catch(() => { if (active) setPairsError(t("launchPairsFailed")); });
    return () => { active = false; };
  }, [parseResponse, t]);

  const submitLaunch = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLaunchError(""); setLaunchResult(null);
    if (!imageFile) { setLaunchError(t("launchImageRequired")); return; }
    setLaunching(true);
    try {
      const imageResponse = await fetch("https://wiredup.app/api/uploads/image", { method: "POST", headers: { "content-type": imageFile.type, "x-file-name": imageFile.name }, body: imageFile });
      const uploaded = await imageResponse.json() as { url?: string; error?: string };
      if (!imageResponse.ok || !uploaded.url) throw new Error(uploaded.error || t("launchImageFailed"));
      const cleanHandle = recipientHandle.trim().replace(/^@/, "");
      const metadata = await parseResponse<{ cid?: string; url?: string }>(await fetch("https://wiredup.app/api/uploads/metadata", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        name: name.trim(), symbol: symbol.trim().toUpperCase(), description: description.trim(), image: uploaded.url,
        website: "", twitter: recipientPlatform === "x" ? `https://x.com/${cleanHandle}` : "",
      }) }));
      const result = await parseResponse<{ contractAddress: string; transactionHash: string }>(await fetch("https://wiredup.app/api/miniapp/launches/sponsored", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        recipientHandle: cleanHandle, recipientPlatform, pairAsset, metadataUri: metadata.cid || metadata.url,
        token: { name: name.trim(), symbol: symbol.trim().toUpperCase(), description: description.trim(), image: uploaded.url, website: "", twitter: recipientPlatform === "x" ? `https://x.com/${cleanHandle}` : "" },
      }) }));
      setLaunchResult({ token: result.contractAddress, hash: result.transactionHash });
      setName(""); setSymbol(""); setDescription(""); setRecipientHandle(""); setImageFile(null);
    } catch (caught) { setLaunchError(caught instanceof Error ? caught.message : t("launchFailed")); }
    finally { setLaunching(false); }
  }, [description, imageFile, name, pairAsset, parseResponse, recipientHandle, recipientPlatform, symbol, t]);

  return <main className="min-h-screen w-full bg-[#050505] text-white selection:bg-[#ffd400] selection:text-black">
    <header className="border-b border-[#29240f] bg-[#050505]/95 px-4 py-4 sm:px-7"><div className="mx-auto flex max-w-5xl items-center gap-3"><IpfsImage cid="bafkreihxnba2ld6ak4pkwgwruxodwdx3qgjmi2lp4tr4aiqbl6gcllahuy" alt="WIRED" className="h-12 w-[74px] rounded-lg border border-[#332b0b] object-cover" /><div className="leading-none"><strong className="block text-lg font-black">WIRED</strong><small className="mt-1 block font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#ffd400]">{t("brandTagline")}</small></div><div className="ml-auto rounded-full border border-[#4b3e09] bg-[#100e04] px-3 py-1.5 font-mono text-[9px] font-bold uppercase text-[#ffd400]">{t("miniApp")}</div></div></header>

    <section className="border-b border-[#29240f] px-5 py-12 sm:px-8 sm:py-16"><div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_340px] lg:items-center"><div><p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffd400]">{t("eyebrow")}</p><h1 className="mt-4 text-5xl font-black leading-[.9] tracking-[-.06em] sm:text-7xl">{t("title")}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-[#aaa]">{t("description")}</p></div><IpfsImage cid="bafkreidickldhqnt52f74mm6iq5gd5yfjifujlu6erx6qybtcktygepvkq" alt="WIRED. Wire fees to social media." className="h-64 w-full rounded-2xl border border-[#30290c] bg-black object-contain" loading="eager" fetchPriority="high" /></div></section>

    <section className="border-b border-[#29240f] px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-5xl"><div className="mb-6"><p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[#ffd400]">{t("launchEyebrow")}</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">{t("launchTitle")}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#888]">{t("launchDescription")}</p></div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-[#30290c] bg-[#0b0b08] p-4"><strong className="text-[#ffd400]">1. Launch</strong><p className="mt-1 text-xs leading-5 text-[#888]">WIRED validates, simulates and funds the zero-buy Flap deployment.</p></div><div className="rounded-xl border border-[#30290c] bg-[#0b0b08] p-4"><strong className="text-[#ffd400]">2. Verify</strong><p className="mt-1 text-xs leading-5 text-[#888]">The recipient has 21 days to verify and claim. After that, the allocation is automatically donated to Giggle Academy.</p></div><div className="rounded-xl border border-[#30290c] bg-[#0b0b08] p-4"><strong className="text-[#ffd400]">3. Wire fees</strong><p className="mt-1 text-xs leading-5 text-[#888]">70% goes to the recipient, 25% buys back and burns WIRED, and 5% covers ecosystem costs.</p></div></div>
      <form onSubmit={submitLaunch} className="grid min-w-0 gap-4 rounded-2xl border border-[#30290c] bg-[#0b0b08] p-5 sm:p-6 lg:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-xs font-bold text-[#aaa]">{t("launchName")}<input required maxLength={64} value={name} onChange={(e) => setName(e.target.value)} className="w-full min-w-0 rounded-xl border border-[#35301b] bg-black px-4 py-3 text-sm text-white outline-none focus:border-[#ffd400]" /></label>
        <label className="grid min-w-0 gap-2 text-xs font-bold text-[#aaa]">{t("launchSymbol")}<input required pattern="[A-Za-z0-9]{1,13}" maxLength={13} value={symbol} onChange={(e) => setSymbol(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())} className="w-full min-w-0 rounded-xl border border-[#35301b] bg-black px-4 py-3 text-sm uppercase text-white outline-none focus:border-[#ffd400]" /></label>
        <label className="grid min-w-0 gap-2 text-xs font-bold text-[#aaa] lg:col-span-2">{t("launchDescriptionLabel")}<textarea required maxLength={500} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-w-0 resize-none rounded-xl border border-[#35301b] bg-black px-4 py-3 text-sm text-white outline-none focus:border-[#ffd400]" /></label>
        <label className="grid min-w-0 gap-2 text-xs font-bold text-[#aaa]">{t("launchRecipientPlatform")}<select value={recipientPlatform} onChange={(e) => { setRecipientPlatform(e.target.value); if (e.target.value === "charity") setRecipientHandle("giggle-fund"); }} className="w-full min-w-0 rounded-xl border border-[#35301b] bg-black px-4 py-3 text-sm text-white outline-none focus:border-[#ffd400]"><option value="fomo">Fomo — Automatic payout</option><option value="x">X</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="spotify">Spotify Artist — Beta</option><option value="soundcloud">SoundCloud</option><option value="twitch">Twitch — Beta</option><option value="kick">Kick — Beta</option><option value="rumble">Rumble — Beta</option><option value="patreon">Patreon — Beta</option><option value="weibo">Weibo — Beta</option><option value="truth-social">Truth Social</option><option value="reddit">Reddit</option><option value="telegram-channel">Telegram Channel/Group</option><option value="telegram-personal">Telegram Personal Account</option><option value="binance-square">Binance Square</option><option value="charity">Charities</option></select></label>
        <label className="grid min-w-0 gap-2 text-xs font-bold text-[#aaa]">{recipientPlatform === "charity" ? t("launchCharity") : t("launchRecipient")}{recipientPlatform === "charity" ? <select required value={recipientHandle || "giggle-fund"} onChange={(e) => setRecipientHandle(e.target.value)} className="w-full min-w-0 rounded-xl border border-[#35301b] bg-black px-4 py-3 text-sm text-white"><option value="giggle-fund">Giggle Fund</option><option value="st-jude">St. Jude Children’s Research Hospital</option></select> : <input required maxLength={64} value={recipientHandle} onChange={(e) => setRecipientHandle(e.target.value)} placeholder="@creator" className="w-full min-w-0 rounded-xl border border-[#35301b] bg-black px-4 py-3 text-sm text-white outline-none focus:border-[#ffd400]" />}</label>
        <label className="grid min-w-0 gap-2 text-xs font-bold text-[#aaa] lg:col-span-2">{t("launchPair")}<select required value={pairAsset} onChange={(e) => setPairAsset(e.target.value)} disabled={!pairs.length} className="w-full min-w-0 rounded-xl border border-[#35301b] bg-black px-4 py-3 text-sm text-white outline-none focus:border-[#ffd400] disabled:opacity-60">{pairs.length ? pairs.map((pair) => <option key={pair.address} value={pair.symbol}>{pair.symbol} — {pair.name}</option>) : <option value="BNB">BNB</option>}</select><small className={pairsError ? "text-red-300" : "font-normal text-[#666]"}>{pairsError || (pairs.length ? t("launchPairsLoaded").replace("{count}", String(pairs.length)) : t("launchPairsLoading"))}</small></label>
        <label className="grid min-w-0 gap-2 text-xs font-bold text-[#aaa] lg:col-span-2">{t("launchImage")}<input required accept="image/png,image/jpeg,image/webp,image/gif" type="file" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full min-w-0 rounded-xl border border-dashed border-[#4b421d] bg-black px-4 py-4 text-xs text-[#aaa] file:mr-3 file:rounded-full file:border-0 file:bg-[#ffd400] file:px-3 file:py-2 file:text-xs file:font-black file:text-black" /></label>
        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#777]">WIRED sponsors the deployment · one successful launch per IP every four hours</p><button disabled={launching} type="submit" className="rounded-xl bg-[#ffd400] px-6 py-3 text-sm font-black text-black disabled:opacity-50">{launching ? t("launching") : t("launchButton")}</button></div>
        {launchError ? <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200 lg:col-span-2">{launchError}</p> : null}
        {launchResult ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200 lg:col-span-2"><strong>{t("launchSuccess")}</strong><p className="mt-2 break-all font-mono text-xs">{launchResult.token}</p><div className="mt-3 flex gap-2"><ExternalLink url={`https://flap.sh/bnb/${launchResult.token}`} locale={i18n.locale} className="rounded-lg bg-[#ffd400] px-3 py-2 text-xs font-black !text-black no-underline">{t("trade")}</ExternalLink><ExternalLink url={`https://bscscan.com/tx/${launchResult.hash}`} locale={i18n.locale} className="rounded-lg border border-[#3a3210] px-3 py-2 text-xs font-bold !text-white no-underline">{t("onchain")}</ExternalLink></div></div> : null}
      </form>
    </div></section>
    <footer className="px-5 py-8"><div className="mx-auto flex max-w-5xl flex-col gap-2 text-xs text-[#777] sm:flex-row sm:justify-between"><strong className="text-base text-white">WIRED</strong><p>Launches are funded by WIRED and remain visible in the public explorer.</p></div></footer>
  </main>;
}
