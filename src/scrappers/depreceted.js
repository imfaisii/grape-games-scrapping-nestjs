/* TODO: This is not required now as the video is already downloaded
  async downloadFile(url, filePath) {
    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }
  
const result: any = extractSubstring(
  content,
  '[{"representations":',
  ',"video_id"',
);

const jsonParsed = JSON.parse(result);

let video = null;
let audio = null;
const outputFilename = `${uuidv4()}.mp4`;
const audioInputFileName = `a-${outputFilename}`;
const videoInputFileName = `v-${outputFilename}`;

for (const obj of jsonParsed) {
  if (obj.mime_type.startsWith('video/')) {
    video = obj.base_url;
  } else if (obj.mime_type.startsWith('audio/')) {
    audio = obj.base_url;
  }
}

if (!audio) {
  return { data: video };
}

await this.downloadFile(audio, `public/${audioInputFileName}`);
await this.downloadFile(video, `public/${videoInputFileName}`);

await new Promise((resolve, reject) => {
  ffmpeg()
    .input(`public/${audioInputFileName}`)
    .input(`public/${videoInputFileName}`)
    .outputOptions('-c:v copy')
    .outputOptions('-c:a aac')
    .save(`public/${outputFilename}`)
    .on('end', resolve)
    .on('error', reject);
});

await deleteFile(`public/${audioInputFileName}`);
await deleteFile(`public/${videoInputFileName}`);

return { data: `${hostname}/public/${outputFilename}` };
*/
