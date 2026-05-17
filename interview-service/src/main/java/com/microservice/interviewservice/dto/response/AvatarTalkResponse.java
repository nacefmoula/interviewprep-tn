package com.microservice.interviewservice.dto.response;

public class AvatarTalkResponse {
    private String talkId;
    private String resultUrl;
    private String status;
    private Double duration;

    public AvatarTalkResponse() {
    }

    public AvatarTalkResponse(String talkId, String resultUrl, String status, Double duration) {
        this.talkId = talkId;
        this.resultUrl = resultUrl;
        this.status = status;
        this.duration = duration;
    }

    public String getTalkId() {
        return talkId;
    }

    public void setTalkId(String talkId) {
        this.talkId = talkId;
    }

    public String getResultUrl() {
        return resultUrl;
    }

    public void setResultUrl(String resultUrl) {
        this.resultUrl = resultUrl;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getDuration() {
        return duration;
    }

    public void setDuration(Double duration) {
        this.duration = duration;
    }
}