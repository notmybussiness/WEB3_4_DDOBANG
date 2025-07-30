package com.ddobang.backend.global.auth.controller;

import com.ddobang.backend.domain.member.entity.Member;
import com.ddobang.backend.global.response.ResponseFactory;
import com.ddobang.backend.global.response.SuccessResponse;
import com.ddobang.backend.global.security.jwt.JwtTokenProvider;
import com.ddobang.backend.global.security.jwt.JwtTokenType;
import com.ddobang.backend.global.security.jwt.JwtTokenFactory;
import com.ddobang.backend.global.util.CookieUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 테스트 전용 인증 컨트롤러
 * 성능 테스트 및 개발 목적으로만 사용
 * 
 * WARNING: 프로덕션 환경에서는 제거해야 함
 */
@Tag(name = "테스트 인증", description = "성능 테스트용 JWT 토큰 생성 API")
@RestController
@RequestMapping("/api/v1/test")
@RequiredArgsConstructor
@Slf4j
public class TestAuthController {
    
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtTokenFactory jwtTokenFactory;
    private final CookieUtil cookieUtil;

    @Operation(
        summary = "테스트용 JWT 토큰 생성", 
        description = "성능 테스트를 위한 임시 JWT 토큰을 생성합니다. 쿠키에 자동으로 설정됩니다."
    )
    @PostMapping("/jwt")
    public ResponseEntity<SuccessResponse<Map<String, Object>>> generateTestJwt(
            @RequestParam(defaultValue = "1") Long userId,
            @RequestParam(defaultValue = "테스트유저") String nickname,
            @RequestParam(defaultValue = "false") boolean isAdmin,
            HttpServletResponse response) {
        
        log.warn("🚨 테스트용 JWT 토큰 생성 - 사용자 ID: {}, 닉네임: {}", userId, nickname);
        
        // 테스트용 임시 Member 객체 생성 후 ID 설정
        Member testMember = Member.builder()
                .nickname(nickname)
                .build();
        
        // Reflection으로 ID 설정 (테스트 목적)
        try {
            java.lang.reflect.Field idField = Member.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(testMember, userId);
        } catch (Exception e) {
            log.warn("ID 설정 실패, 기본 ID 사용: {}", e.getMessage());
        }
        
        // JWT 토큰 생성
        String accessToken = jwtTokenProvider.generateToken(testMember, JwtTokenType.ACCESS, isAdmin);
        String refreshToken = jwtTokenProvider.generateToken(testMember, JwtTokenType.REFRESH, isAdmin);
        
        // 쿠키에 토큰 설정 (HttpOnly, Secure)
        Cookie accessCookie = cookieUtil.createAccessTokenCookie(accessToken);
        Cookie refreshCookie = cookieUtil.createRefreshTokenCookie(refreshToken);
        response.addCookie(accessCookie);
        response.addCookie(refreshCookie);
        
        // 응답 데이터
        Map<String, Object> tokenInfo = Map.of(
                "userId", userId,
                "nickname", nickname,
                "isAdmin", isAdmin,
                "accessTokenLength", accessToken.length(),
                "refreshTokenLength", refreshToken.length(),
                "message", "JWT 토큰이 쿠키에 설정되었습니다. 이제 SSE 테스트를 진행할 수 있습니다."
        );
        
        return ResponseFactory.ok("테스트용 JWT 토큰 생성 성공", tokenInfo);
    }
    
    @Operation(
        summary = "테스트용 토큰 정보 확인", 
        description = "현재 설정된 JWT 토큰의 정보를 확인합니다."
    )
    @GetMapping("/jwt/info")
    public ResponseEntity<SuccessResponse<Map<String, Object>>> getTokenInfo(
            @CookieValue(value = "accessToken", required = false) String accessToken) {
        
        if (accessToken == null) {
            Map<String, Object> noTokenInfo = Map.of(
                    "hasToken", false,
                    "message", "JWT 토큰이 없습니다. /api/v1/test/jwt 엔드포인트로 토큰을 생성하세요."
            );
            return ResponseFactory.ok("토큰 없음", noTokenInfo);
        }
        
        try {
            // 토큰 유효성 검증
            boolean isValid = jwtTokenProvider.isValidToken(accessToken, JwtTokenType.ACCESS);
            String userId = jwtTokenProvider.getSubject(accessToken);
            String nickname = jwtTokenProvider.extractNickname(accessToken);
            boolean isAdmin = jwtTokenProvider.extractIsAdmin(accessToken);
            
            Map<String, Object> tokenInfo = Map.of(
                    "hasToken", true,
                    "isValid", isValid,
                    "userId", userId,
                    "nickname", nickname != null ? nickname : "N/A",
                    "isAdmin", isAdmin,
                    "tokenLength", accessToken.length(),
                    "message", isValid ? "유효한 JWT 토큰입니다." : "만료되거나 유효하지 않은 토큰입니다."
            );
            
            return ResponseFactory.ok("토큰 정보 조회 성공", tokenInfo);
            
        } catch (Exception e) {
            log.error("토큰 정보 추출 오류: {}", e.getMessage());
            Map<String, Object> errorInfo = Map.of(
                    "hasToken", true,
                    "isValid", false,
                    "error", e.getMessage(),
                    "message", "토큰 파싱 중 오류가 발생했습니다."
            );
            return ResponseFactory.ok("토큰 오류", errorInfo);
        }
    }
    
    @Operation(
        summary = "쿠키 삭제", 
        description = "테스트용 JWT 쿠키를 삭제합니다."
    )
    @DeleteMapping("/jwt")
    public ResponseEntity<SuccessResponse<String>> clearTestJwt(HttpServletResponse response) {
        
        log.info("🧹 테스트용 JWT 쿠키 삭제");
        
        // 쿠키 삭제
        Cookie deleteAccessCookie = cookieUtil.deleteCookie("accessToken");
        Cookie deleteRefreshCookie = cookieUtil.deleteCookie("refreshToken");
        response.addCookie(deleteAccessCookie);
        response.addCookie(deleteRefreshCookie);
        
        return ResponseFactory.ok("JWT 쿠키 삭제 완료", "모든 인증 쿠키가 삭제되었습니다.");
    }
}