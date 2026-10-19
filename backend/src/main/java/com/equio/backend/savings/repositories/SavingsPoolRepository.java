package com.equio.backend.savings.repositories;

import com.equio.backend.savings.entities.SavingsPool;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SavingsPoolRepository extends JpaRepository<SavingsPool, Long> {
    Optional<SavingsPool> findByUserId(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select pool from SavingsPool pool where pool.user.id = :userId")
    Optional<SavingsPool> findByUserIdForUpdate(@Param("userId") Long userId);
}
