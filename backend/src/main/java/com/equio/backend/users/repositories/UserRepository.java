package com.equio.backend.users.repositories;

import com.equio.backend.users.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User,Long> {
    Optional<User> findByEmail(String email);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.email = :email")
    Optional<User> findLockedByEmail(@org.springframework.data.repository.query.Param("email") String email);
    boolean existsByEmail(String email);

    @Query("select user.id from User user")
    java.util.List<Long> findAllIds();

    @Query("select u.id from User u where u.id > :cursor order by u.id")
    List<Long> findIdsAfter(@org.springframework.data.repository.query.Param("cursor") long cursor,
                           org.springframework.data.domain.Pageable pageable);
}
