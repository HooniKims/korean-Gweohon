# Kenney 에셋 (CC0)

`public/models/kenney/` 의 모델은 Kenney(https://kenney.nl)의 CC0 에셋이다.

- 라이선스: Creative Commons Zero (CC0 1.0) — 개인·교육·상업 프로젝트에 자유롭게 사용
- 크레딧 표기는 의무가 아니지만 권장된다
- 받은 팩: Nature Kit 2.1, City Kit (Suburban), Furniture Kit, Food Kit
- 원본 zip과 전체 추출본은 저장소에 넣지 않는다. 쓰는 것만 복사해 커밋한다.

## 다시 받는 방법

```bash
# 페이지에서 zip 링크를 찾아 받는다
curl -sL "https://kenney.nl/assets/nature-kit" | grep -oE 'https://kenney\.nl/media/pages/assets/[^"]*\.zip'
```

## 쓰는 곳

`src/three/Scatter.tsx` — 넓은 맵의 빈 곳을 채우는 장식. 물리 바디를 만들지
않고 InstancedMesh로 묶는다.
