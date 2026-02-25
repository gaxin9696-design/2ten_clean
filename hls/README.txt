Cloudflare Pages (HLS) repo template

- Project/domain mong muốn: https://2ten-hls.pages.dev

Cách dùng:
1) Deploy repo này lên Cloudflare Pages (Framework: None, Build command: trống, Output directory: /).
2) Copy output HLS (master.m3u8 + 0/1/2 + seg_*.ts) vào:
   hls/khoii/e01/
   hls/khoii/e02/
3) Link ví dụ:
   https://2ten-hls.pages.dev/hls/khoii/e01/master.m3u8

File _headers đã bật CORS cho /hls/*.
