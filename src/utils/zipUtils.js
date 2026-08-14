import JSZip from "jszip";

/**
 * Downloads all photos and documents from a claim, grouped into category folders.
 * @param {Object} claim - The claim object containing poze and documente
 * @param {String} claimNumber - Claim display number or ID
 */
export async function downloadClaimAsZip(claim, claimNumber = "dosar") {
  const zip = new JSZip();

  const sanitizeName = (str) => (str || "fara_nume").replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  const folderName = `Dosar_${sanitizeName(claim.numarDosar || claimNumber || claim.id)}`;
  const root = zip.folder(folderName);

  const poze = Array.isArray(claim.poze) ? claim.poze : [];
  const documente = Array.isArray(claim.documente) ? claim.documente : [];

  const folders = {
    receptie: root.folder("Receptie"),
    reconstatare: root.folder("Reconstatare"),
    predare: root.folder("Predare"),
    generale: root.folder("Poze_Generale"),
    documente: root.folder("Documente"),
  };

  const fetchBytes = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("HTTP error " + response.status);
      return await response.arrayBuffer();
    } catch (err) {
      console.warn("Could not fetch file for zip:", url, err);
      return null;
    }
  };

  // Add photos
  for (let i = 0; i < poze.length; i++) {
    const p = poze[i];
    if (!p || (!p.url && !p.dataUrl)) continue;
    const itemUrl = p.url || p.dataUrl;
    const cat = (p.categoria || p.categorie || "generale").toLowerCase();
    const targetFolder = folders[cat] || folders.generale;
    const filename = sanitizeName(p.nume || `foto_${i + 1}.jpg`);

    const bytes = await fetchBytes(itemUrl);
    if (bytes) {
      targetFolder.file(filename, bytes);
    }
  }

  // Add documents
  for (let i = 0; i < documente.length; i++) {
    const d = documente[i];
    if (!d || (!d.url && !d.dataUrl)) continue;
    const itemUrl = d.url || d.dataUrl;
    const filename = sanitizeName(d.nume || `doc_${i + 1}.pdf`);

    const bytes = await fetchBytes(itemUrl);
    if (bytes) {
      folders.documente.file(filename, bytes);
    }
  }

  // Generate zip file and trigger download
  const content = await zip.generateAsync({ type: "blob" });

  if (typeof document !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
    const downloadUrl = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${folderName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
  }

  return content;
}
