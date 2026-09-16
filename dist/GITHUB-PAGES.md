# Đưa thiệp lên GitHub Pages

## Cách nhanh nhất

1. Giải nén `thiepqr-github-pages.zip`.
2. Tạo một repository mới trên GitHub.
3. Chọn **Add file → Upload files** rồi tải toàn bộ **nội dung bên trong** thư mục vừa giải nén lên nhánh `main`.
4. Mở **Settings → Pages**.
5. Tại **Build and deployment**, chọn **Deploy from a branch**.
6. Chọn nhánh `main`, thư mục `/(root)`, rồi nhấn **Save**.
7. Chờ GitHub hiện đường dẫn dạng `https://ten-tai-khoan.github.io/ten-repository/`.

Hãy mở thử đường dẫn đó trên điện thoại trước khi tạo mã QR.

## Thay nội dung cá nhân trước khi tải lên

- Sửa toàn bộ lời nhắn, thứ tự màn hình, nút và caption trong `data/content.json`.
- Chép ba ảnh vào `assets/images/` với tên `photo-01.jpg`, `photo-02.jpg`, `photo-03.jpg`.
- Chép ảnh món quà vào `assets/images/gift.jpg`.
- Chép bài hát vào `assets/audio/song.mp3`.

Nếu chưa thêm ảnh hoặc nhạc, website vẫn chạy và hiển thị trạng thái dự phòng. Không cần sửa HTML hay JavaScript.

## Cập nhật sau này

Sửa hoặc thay tệp trong repository rồi commit lên `main`. GitHub Pages sẽ tự cập nhật sau vài phút. Giữ nguyên tên tệp nếu không muốn sửa đường dẫn trong `data/content.json`.
