# Hướng dẫn đóng góp — Chess Online

Tài liệu mô tả quy trình làm việc chung của team trên repo này. Mục tiêu: `main` luôn ở trạng thái chạy được, và mọi thay đổi đều qua review.

## Quy trình tổng quát (GitHub Flow)

1. Đồng bộ `main` mới nhất
2. Tạo branch tính năng từ `main`
3. Code + commit trên branch đó
4. Push branch lên remote
5. Mở Pull Request vào `main`
6. Đợi CI xanh + ít nhất 1 review approve
7. Merge, rồi xóa branch

Không ai push thẳng vào `main`.

## 1. Đồng bộ trước khi làm

```bash
git checkout main
git pull origin main
```

## 2. Tạo branch

Đặt tên theo quy ước `<loại>/<mô-tả-ngắn>`:

| Loại | Khi nào dùng | Ví dụ |
|------|--------------|-------|
| `feature/` | Tính năng mới | `feature/chon-quan-phong-cap` |
| `fix/` | Sửa lỗi | `fix/dong-ho-tinh-sai` |
| `chore/` | Cấu hình, dọn dẹp | `chore/cap-nhat-deps` |
| `docs/` | Tài liệu | `docs/huong-dan-deploy` |

```bash
git checkout -b feature/ten-tinh-nang
```

## 3. Commit

- Commit nhỏ, mỗi commit là một thay đổi có nghĩa
- Viết message rõ ràng, mô tả "làm gì + tại sao"
- Không commit `node_modules/`, `dist/`, file `.env` hay file build

```bash
git add <file cụ thể>
git commit -m "Thêm lựa chọn quân khi phong cấp"
```

## 4. Push + mở PR

```bash
git push -u origin feature/ten-tinh-nang
```

Lên GitHub mở Pull Request vào `main`. Điền đầy đủ template PR (mô tả, phạm vi, cách test).

## 5. Review & merge

- PR cần **CI pass** và **ít nhất 1 approve** mới merge được
- Người được tag trong `CODEOWNERS` sẽ tự động được yêu cầu review
- Sửa theo góp ý bằng cách push thêm commit lên cùng branch
- Sau khi merge: xóa branch để repo gọn gàng

## Chạy dự án (kiểm thử trước khi mở PR)

```bash
npm run install:all   # cài deps client + server (Node 18+)
npm run dev           # client :5173, server :3001
```

Trước khi mở PR, tối thiểu phải:
- `cd client && npm run build` chạy được (CI cũng kiểm tra cái này)
- Test thủ công mode bị ảnh hưởng (Local / vs AI / Online)

## Xử lý conflict

Nếu `main` đã đi trước branch của bạn:

```bash
git checkout feature/ten-tinh-nang
git fetch origin
git merge origin/main      # giải quyết conflict rồi commit
git push
```

Không dùng `git push --force` lên branch dùng chung trừ khi cả team đã thống nhất.
