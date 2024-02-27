# Eje-gong creator AI

[Google shorts](https://www.youtube.com/channel/UC9wnpGyTlZdp3WSEgtySBIw) 명언 생성 자동화

## 아키텍쳐 계획

- 프로토타입은 [make.com](https://www.make.com)으로 작성
- [openAI](https://openai.com/blog/openai-api)를 통해서 명언 생성
- [Google Text-to-Speech](https://cloud.google.com/text-to-speech?hl=ko)를 통해서 텍스트 음성으로 변환
- [midjourney](https://www.midjourney.com/)를 통해서 명언 관련 이미지 생성
  - 미드저니 api가 현재 없어서 일단 [useapi](https://useapi.net/)로 일단 우회
  - 추후 discord를 bot으로 변경해야 할듯
- [creatomate]((https://creatomate.com/docs/api/introduction))로 비디오 생성 
  - 비싸다.. 추후 phyton으로 동영상 생성해야 할듯 
  - OpenCV, imageio, MoviePy
- [buffer](https://buffer.com/)를 통해서 미디어 등록
- [Airtable](https://airtable.com/developers/web/api/introduction)로 데이터 관리
- 서비스 트랜잭션은 redis 기반 [redlock](https://redis.io/docs/manual/patterns/distributed-locks/#is-the-algorithm-asynchronous)

- 진행 관리는 [텔레그램 봇](https://core.telegram.org/)
- 최종적으로 nodejs로 서비스 제작
- error 관리는 [sentry](https://sentry.io/)
- ci/cd [GithubAction](https://docs.github.com/ko/actions)
  - docker 저장소는 [github registry](https://docs.github.com/ko/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

## Service
make.com 으로 작업한것을 순차적으로 nodejs 코드로 변환

## Production

프로그램 규모가 작아서 synology nas에 [github self hosted runner](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners)로 배포하고 docker in docker로 실행
  - 바이너리로 설치하고 싶었는데.. 좀 복잡하다..

