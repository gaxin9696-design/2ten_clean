HƯỚNG DẪN UP DỰ ÁN LÊN GITHUB PAGES + CLOUDFLARE PAGES (HLS)

Gói này có 2 phần:
1) 2ten_clean/  -> Web UI (GitHub Pages)
2) 2ten-hls/    -> HLS static (Cloudflare Pages)

Link HLS base đã được set sẵn trong movies.json:
https://2ten-hls.pages.dev

========================================
A) Upload WEB lên GitHub (GitHub Pages)
========================================

Cách 1 (dễ nhất - upload bằng web):
1) Vào GitHub -> New repository
   - Repo name: 2ten_clean (hoặc tên bạn muốn)
   - Public
2) Vào repo mới -> Add file -> Upload files
3) Kéo thả toàn bộ nội dung TRONG thư mục 2ten_clean/ lên (index.html, admin.html, movies.json, assets/)
4) Commit changes

Bật GitHub Pages:
1) Repo -> Settings -> Pages
2) Source: Deploy from a branch
3) Branch: main / (root)
4) Save
=> Website sẽ có dạng:
https://<username>.github.io/<repo>/

========================================
B) Upload HLS lên GitHub + Deploy Cloudflare Pages
========================================

B1) Tạo repo HLS trên GitHub:
1) GitHub -> New repository
   - Repo name: 2ten-hls (khuyên dùng trùng để dễ nhớ)
   - Public
2) Upload toàn bộ nội dung TRONG thư mục 2ten-hls/ lên repo (phải có _headers ở root)
3) Commit changes

B2) Deploy repo đó lên Cloudflare Pages:
1) Vào Cloudflare Dashboard -> Pages -> Create a project
2) Connect to Git -> chọn GitHub -> chọn repo 2ten-hls
3) Build settings:
   - Framework preset: None
   - Build command: (để trống)
   - Output directory: /
4) Deploy

Lưu ý: Đặt Project name là "2ten-hls" để domain ra đúng:
https://2ten-hls.pages.dev

========================================
C) Copy HLS output (ffmpeg) vào repo 2ten-hls
========================================
Sau khi encode ra HLS, bạn sẽ có:
- master.m3u8
- 0/prog.m3u8 + seg_*.ts
- 1/prog.m3u8 + seg_*.ts
- 2/prog.m3u8 + seg_*.ts

Bạn copy toàn bộ vào:
2ten-hls/hls/khoii/e01/   (tập 1)
2ten-hls/hls/khoii/e02/   (tập 2)

Sau đó commit & push lên GitHub => Cloudflare Pages tự deploy lại.

========================================
D) Kiểm tra link HLS
========================================
Mở thử:
https://2ten-hls.pages.dev/hls/khoii/e01/master.m3u8

Nếu mở được (thấy nội dung m3u8) là OK.

========================================
E) Update movies.json (nếu bạn đổi đường dẫn)
========================================
Web đọc movies.json, chỉ cần chỉnh trường "hls" trỏ tới đúng link Cloudflare Pages.
