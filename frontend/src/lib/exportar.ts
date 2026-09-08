// Dispara o download de um arquivo devolvido pela API.
// Usado por todas as telas que exportam Excel, para o comportamento ser sempre o mesmo.
export async function baixarArquivo(resposta: Response, nomeArquivo: string): Promise<void> {
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null)
    throw new Error(corpo?.error ?? 'Não foi possível gerar o arquivo')
  }
  const blob = await resposta.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(url)
}
