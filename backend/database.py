from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL 연결 설정
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:1234@localhost:5432/db_term_project"
)

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """데이터베이스 세션 의존성"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """데이터베이스 테이블 생성 및 기본 데이터 초기화"""
    # 모든 모델을 import하여 Base에 등록
    from models import (
        User, Role, UserRole, Permission, RolePermission,
        Room, Match, MatchPlayer, Round, RoundCard, Action,
        CardTemplate, DeckInstance
    )
    Base.metadata.create_all(bind=engine)
    
    # 기본 데이터 초기화
    init_roles()
    init_permissions()
    init_role_permissions()
    init_db_permissions()

def init_roles():
    """기본 역할 데이터 초기화 (SQL 사용)"""
    from sqlalchemy import text
    from models.role import Role
    
    db = SessionLocal()
    try:
        # 기본 역할들이 이미 있는지 확인
        existing_roles = db.query(Role).all()
        if existing_roles:
            print("✓ 기본 역할이 이미 존재합니다")
            return
        
        # SQL로 기본 역할 INSERT
        roles_data = [
            ("guest", "게스트 사용자 - 방 참가만 가능"),
            ("member", "일반 회원"),
            ("ai_manager", "AI 관리자"),
            ("system_admin", "시스템 관리자"),
        ]
        
        for role_name, description in roles_data:
            db.execute(
                text("""
                    INSERT INTO roles (name, description, created_at)
                    VALUES (:name, :description, NOW())
                    ON CONFLICT (name) DO NOTHING
                """),
                {"name": role_name, "description": description}
            )
        
        db.commit()
        print("✓ 기본 역할 초기화 완료")
    except Exception as e:
        db.rollback()
        print(f"⚠ 역할 초기화 중 오류: {e}")
    finally:
        db.close()

def init_permissions():
    """기본 권한 데이터 초기화 (SQL 사용)"""
    from sqlalchemy import text
    from models.permission import Permission
    
    db = SessionLocal()
    try:
        # 기본 권한들이 이미 있는지 확인
        existing_permissions = db.query(Permission).all()
        if existing_permissions:
            print("✓ 기본 권한이 이미 존재합니다")
            return
        
        # SQL로 기본 권한 INSERT
        permissions_data = [
            ("create_room", "rooms", "INSERT", "방 생성 권한"),
            ("join_room", "rooms", "INSERT", "방 참가 권한"),
            ("view_room", "rooms", "SELECT", "방 조회 권한"),
            ("manage_ai", "ai", "UPDATE", "AI 관리 권한"),
            ("manage_users", "users", "UPDATE", "사용자 관리 권한"),
            ("manage_roles", "roles", "UPDATE", "역할 관리 권한"),
            ("view_game_data", "game_data", "SELECT", "게임 데이터 조회 권한"),
            ("manage_game_data", "game_data", "UPDATE", "게임 데이터 관리 권한"),
        ]
        
        for name, resource, action, description in permissions_data:
            db.execute(
                text("""
                    INSERT INTO permissions (name, resource, action, description, created_at)
                    VALUES (:name, :resource, :action, :description, NOW())
                    ON CONFLICT (name) DO NOTHING
                """),
                {"name": name, "resource": resource, "action": action, "description": description}
            )
        
        db.commit()
        print("✓ 기본 권한 초기화 완료")
    except Exception as e:
        db.rollback()
        print(f"⚠ 권한 초기화 중 오류: {e}")
    finally:
        db.close()

def init_role_permissions():
    """역할-권한 연결 초기화 (SQL 사용)"""
    from sqlalchemy import text
    
    db = SessionLocal()
    try:
        # 역할-권한 연결이 이미 있는지 확인
        result = db.execute(text("SELECT COUNT(*) FROM role_permissions")).scalar()
        if result > 0:
            print("✓ 역할-권한 연결이 이미 존재합니다")
            return
        
        # 역할별 권한 매핑
        # 먼저 모든 권한 목록 가져오기
        all_permissions = db.execute(text("SELECT name FROM permissions")).fetchall()
        all_permission_names = [p[0] for p in all_permissions]
        
        role_permissions = {
            "guest": ["join_room", "view_room"],
            "member": ["create_room", "join_room", "view_room", "view_game_data"],
            "ai_manager": ["create_room", "join_room", "view_room", "manage_ai", "view_game_data"],
            "system_admin": all_permission_names,  # 모든 권한 부여
        }
        
        for role_name, permission_names in role_permissions.items():
            # 역할 ID 가져오기
            role_result = db.execute(
                text("SELECT id FROM roles WHERE name = :name"),
                {"name": role_name}
            ).first()
            
            if not role_result:
                continue
            
            role_id = role_result[0]
            
            # 각 권한에 대해 연결
            for permission_name in permission_names:
                permission_result = db.execute(
                    text("SELECT id FROM permissions WHERE name = :name"),
                    {"name": permission_name}
                ).first()
                
                if not permission_result:
                    continue
                
                permission_id = permission_result[0]
                
                # 역할-권한 연결 INSERT
                db.execute(
                    text("""
                        INSERT INTO role_permissions (role_id, permission_id, granted_at)
                        VALUES (:role_id, :permission_id, NOW())
                        ON CONFLICT (role_id, permission_id) DO NOTHING
                    """),
                    {"role_id": role_id, "permission_id": permission_id}
                )
        
        db.commit()
        print("✓ 역할-권한 연결 초기화 완료")
    except Exception as e:
        db.rollback()
        print(f"⚠ 역할-권한 연결 초기화 중 오류: {e}")
    finally:
        db.close()

def init_db_permissions():
    """PostgreSQL 데이터베이스 레벨 권한 초기화 (GRANT)"""
    from sqlalchemy import text
    
    db = SessionLocal()
    try:
        # 모든 역할 생성 (PostgreSQL 역할)
        roles = ["guest", "member", "ai_manager", "system_admin"]
        
        for role_name in roles:
            db.execute(text(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '{role_name}') THEN
                        CREATE ROLE {role_name};
                    END IF;
                END
                $$;
            """))
        
        # 게임 플레이에 필요한 테이블들
        game_play_tables = [
            "rooms", "matches", "match_players", "rounds", 
            "round_cards", "actions"
        ]
        
        # 게임 로그 저장에 필요한 테이블들 (INSERT/UPDATE/DELETE 모두 필요)
        game_log_tables = [
            "matches", "match_players", "rounds", 
            "round_cards", "actions", "deck_instances"
        ]
        
        # 덱 관련 테이블
        deck_tables = ["card_templates", "deck_instances"]
        
        # 게스트 권한: 방 참가 및 자신이 참가한 게임 정보 조회/저장
        # (방 생성은 애플리케이션 레벨에서 차단)
        for table_name in game_play_tables:
            db.execute(text(f"""
                GRANT SELECT ON {table_name} TO guest;
            """))
        
        # 덱 테이블 조회 권한 (게임 플레이 시 필요)
        for table_name in deck_tables:
            db.execute(text(f"""
                GRANT SELECT ON {table_name} TO guest;
            """))
        
        # 게스트는 게임 플레이 시 로그 저장 가능
        for table_name in game_log_tables:
            db.execute(text(f"""
                GRANT INSERT, UPDATE, DELETE ON {table_name} TO guest;
            """))
        
        # 게스트는 rooms 테이블 업데이트 가능 (방 참가 시)
        db.execute(text("""
            GRANT UPDATE ON rooms TO guest;
        """))
        
        # 일반 회원 권한: 게임 플레이에 필요한 모든 조회 권한
        for table_name in game_play_tables:
            db.execute(text(f"""
                GRANT SELECT ON {table_name} TO member;
            """))
        
        # 덱 테이블 조회 권한
        for table_name in deck_tables:
            db.execute(text(f"""
                GRANT SELECT ON {table_name} TO member;
            """))
        
        # 일반 회원은 방 생성 및 게임 로그 저장 가능
        db.execute(text("""
            GRANT INSERT, UPDATE ON rooms TO member;
        """))
        
        for table_name in game_log_tables:
            db.execute(text(f"""
                GRANT INSERT, UPDATE, DELETE ON {table_name} TO member;
            """))
        
        # 회원가입 시 필요한 권한 (users, user_roles 테이블)
        db.execute(text("""
            GRANT SELECT, INSERT ON users TO guest, member;
        """))
        db.execute(text("""
            GRANT SELECT, INSERT ON user_roles TO guest, member;
        """))
        
        # 권한 체크 시 필요한 테이블 조회 권한
        db.execute(text("""
            GRANT SELECT ON roles TO guest, member;
        """))
        db.execute(text("""
            GRANT SELECT ON permissions TO guest, member;
        """))
        db.execute(text("""
            GRANT SELECT ON role_permissions TO guest, member;
        """))
        
        # card_templates는 초기화 시 한 번만 생성되므로 member만 INSERT 가능
        db.execute(text("""
            GRANT INSERT ON card_templates TO member;
        """))
        
        # AI 관리자에게 게임 로그 테이블 조회 권한 부여
        game_log_tables = [
            "matches", "rounds", "round_cards", "actions", 
            "match_players", "rooms"
        ]
        
        for table_name in game_log_tables:
            db.execute(text(f"""
                GRANT SELECT ON {table_name} TO ai_manager;
            """))
        
        # 시스템 관리자에게 모든 테이블 모든 권한 부여
        db.execute(text("""
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO system_admin;
        """))
        
        db.commit()
        print("✓ 데이터베이스 레벨 권한 초기화 완료")
    except Exception as e:
        db.rollback()
        print(f"⚠ 데이터베이스 권한 초기화 중 오류: {e}")
        print("   (PostgreSQL 역할 생성은 수동으로 해야 할 수 있습니다)")
    finally:
        db.close()

