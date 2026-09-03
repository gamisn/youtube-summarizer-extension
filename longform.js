// Premium: map-reduce summarization for long transcripts.
// Map pass: summarize each chunk. Reduce pass: merge chunk summaries.

const TARGET_CHUNK_CHARS = 24000; // well under typical 8K-token budgets with prompt overhead

export function chunkTranscript(transcript, maxChars = TARGET_CHUNK_CHARS) {
  const sentences = transcript.split(/(?<=[.!?。])\s+/);
  const chunks = [];
  let buf = '';
  for (const s of sentences) {
    // Auto-generated captions often lack sentence punctuation — a single
    // "sentence" can exceed the budget, so hard-split it.
    if (s.length > maxChars) {
      if (buf.trim()) chunks.push(buf.trim());
      buf = '';
      for (let i = 0; i < s.length; i += maxChars) chunks.push(s.slice(i, i + maxChars));
      continue;
    }
    if ((buf + ' ' + s).length > maxChars && buf) {
      chunks.push(buf.trim());
      buf = s;
    } else {
      buf = (buf ? buf + ' ' : '') + s;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

export async function summarizeLongVideo(request, callLlm) {
  const chunks = chunkTranscript(request.transcript);
  if (chunks.length <= 1) return null; // caller falls back to normal path

  const partials = await Promise.all(chunks.map((chunk, i) =>
    callLlm({
      system: 'You summarize PART ' + (i + 1) + '/' + chunks.length + ' of a long video transcript. Capture all key points, names, numbers faithfully. Be dense.',
      user: 'Part ' + (i + 1) + '/' + chunks.length + ' of: "' + request.title + '"\n\n' + chunk
    })
  ));

  const merged = await callLlm({
    system: request.systemPrompt || 'You are a precise assistant that summarizes YouTube transcripts.',
    user: [
      'Video title: ' + request.title,
      'Task: combine these section summaries of ONE long video into a single coherent summary.',
      request.summaryInstruction || '',
      request.customPrompt?.trim() ? 'Additional user instruction: ' + request.customPrompt.trim() : '',
      'Section summaries:',
      partials.map((p, i) => '--- Part ' + (i + 1) + ' ---\n' + p).join('\n\n')
    ].filter(Boolean).join('\n\n')
  });

  return { summary: merged, parts: chunks.length };
}
