export enum QutoeStatus {
    // unknown
    unknown = "unknown",
    // 최초 등록 상태, 주제와, 갯수를 가지고 있다
    Ready = "Ready",
    // 주제와 갯수 가지고 GPT를 통해서 내용 생성 중
    Content_Making = "content_making",
    // 내용 생성 요청
    Content_Request = "content_request",
    // 생성된 내용 컨펌 요청중
    Content_Confirm = "content_confirm",
    // 컨텐츠 내용 완성
    Content_Completed = "content_completed",
    // TTS 요청중
    TTS_Makeing = "tts_makeing",
    // tts 완성
    TTS_Completed = "tts_completed",
    // 이미지 생성 요청
    Image_Ready = "image_ready",
    // 이미지 생성중
    Image_Making = "image_making",
    // 이미지 완성
    Image_Completed = "image_completed",
    // 비디오 생성 요청
    Video_Ready = "video_ready",
    // 비디오 생성중
    Video_Making = "video_making",
    // 비디오 완성
    Video_Completed = "video_completed",
    // 발행 요청
    Publish_Ready = "publish_ready",
    // 발행중
    Publish_Makeing = "publish_makeing",
    // 발행 완료
    Publish_Completed = "video_ready"
}
