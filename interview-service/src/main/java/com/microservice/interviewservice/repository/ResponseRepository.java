package com.microservice.interviewservice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.microservice.interviewservice.model.Response;

@Repository
public interface ResponseRepository extends JpaRepository<Response, Long> {

    List<Response> findBySessionId(Long sessionId);

    List<Response> findBySessionIdOrderByRecordedAtAsc(Long sessionId);

    @Query("SELECT r.question.id FROM Response r WHERE r.session.id = :sessionId")
    List<Long> findQuestionIdsBySessionId(@Param("sessionId") Long sessionId);

    @Modifying
    @Query("DELETE FROM Response r WHERE r.session.id = :sessionId")
    void deleteBySessionId(@Param("sessionId") Long sessionId);
}