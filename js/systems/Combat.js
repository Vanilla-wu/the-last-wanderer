/**
 * Combat —— 攻擊判定、接觸傷害與陷阱（GDD 2.4）
 *
 * - Attack Hitbox vs Enemy：每次揮砍對同一敵人只命中一次
 * - 下劈命中敵人或尖刺：玩家向上彈起（pogo）
 * - Enemy vs Player：接觸傷害，受傷後有無敵時間
 * - Spike / 深谷：扣 1 HP 並回到最後的安全落腳點
 */
const Combat = {
  update(game) {
    const player = game.player;
    const level = game.level;
    if (game.respawning) return;

    const attack = player.getAttackHitbox();
    if (attack) {
      const downward = player.state === PLAYER_STATES.ATTACK && player.attackDir === 'down';
      const spinning = player.state === PLAYER_STATES.SPIRAL;
      for (const enemy of level.enemies) {
        if (enemy.isDead || player.hitTargets.has(enemy)) continue;
        if (!Collision.aabb(attack, enemy.getHitbox())) continue;
        player.hitTargets.add(enemy);
        const knockDir = player.attackDir === 'side' ? player.facing : (enemy.centerX >= player.centerX ? 1 : -1);
        const killed = enemy.takeHit(player.getAttackDamage(), knockDir, downward);
        game.onEnemyHit(enemy, killed, player.facing, {
          damage: player.getAttackDamage(),
          heavy: player.isFinisher() || player.isSpiralFinal() || player.state === PLAYER_STATES.CHARGE_SLASH
        });
        if (spinning && !player.isSpiralFinal()) {
          // 旋風斬前兩斬：幾乎不擊退，讓敵人留在旋風裡吃下一斬
          enemy.velocityX *= 0.2;
          enemy.velocityY *= 0.4;
        } else if (player.isSpiralFinal()) {
          enemy.velocityX *= player.cfg.spiralFinalKnockback;
          game.hitstop = Math.max(game.hitstop, 0.1);
          game.camera.shake(5, 0.2);
        }
        // 三連擊依 pixelfx sword-combo 的 act 分輕重：前兩擊停頓 0.13 秒、震 4 px（amp 2 × 角色放大 2 倍）0.18 秒，
        // 收尾重劈停頓 0.2 秒、震 6 px 0.34 秒
        if (player.isFinisher()) {
          // 連段收尾：擊退更遠、停頓更久
          enemy.velocityX *= player.cfg.finisherKnockback;
          game.hitstop = Math.max(game.hitstop, 0.2);
          game.camera.shake(6, 0.34);
        } else if (player.state === PLAYER_STATES.ATTACK && player.comboStep > 0) {
          game.camera.shake(4, 0.18);
        }
        if (downward) player.pogo(game);
      }
      // 可擊破的物件：下劈命中同樣可以彈起
      for (const b of level.breakables) {
        if (b.broken || player.hitTargets.has(b)) continue;
        if (!Collision.aabb(attack, b.getHitbox())) continue;
        player.hitTargets.add(b);
        const dir = player.attackDir === 'side' ? player.facing : (b.x >= player.centerX ? 1 : -1);
        game.onBreakableHit(b, b.takeHit(player.getAttackDamage()), dir);
        if (downward) player.pogo(game);
      }
      // 冰壁：衝刺斬、旋風斬能斬開，一般攻擊只會被彈開
      const ice = level.tilemap.iceInRect(attack);
      if (ice.length) {
        if (player.isChargedAttack()) {
          for (const { c, r } of ice) game.breakIce(c, r);
        } else if (!player.hitTargets.has('ice')) {
          player.hitTargets.add('ice');
          game.onIceDeflect(attack, player.facing);
        }
      }
      if (downward && !player.pogoUsed && Collision.touchesHazard(attack, level.tilemap)) {
        player.pogo(game);
        game.effects.sparks(player.centerX, player.bottom + 20, player.facing);
      }
    }

    if (player.state === PLAYER_STATES.DEATH) return;

    const hurtbox = player.getHurtbox();
    for (const enemy of level.enemies) {
      if (enemy.isDead || enemy.harmless) continue;
      if (Collision.aabb(hurtbox, enemy.getHitbox()) &&
          player.takeDamage(ENEMY_CONFIG.contactDamage, enemy.centerX, { knockback: !enemy.noKnockback })) {
        game.onPlayerDamaged();
        break;
      }
    }

    // 敵人的攻擊判定（持刀骷髏的刀、骷髏王的拳頭與震波）：只在出手的那一小段時間有判定
    if (player.state !== PLAYER_STATES.DEATH) {
      for (const enemy of level.enemies) {
        if (enemy.isDead) continue;
        // 持刀骷髏的刀是一個判定框；骷髏王的拳頭與震波可能同時有好幾個
        const boxes = enemy.getAttackHitboxes ? enemy.getAttackHitboxes() : enemy.getAttackHitbox ? [enemy.getAttackHitbox()] : [];
        const hit = boxes.find((b) => b && Collision.aabb(player.getHurtbox(), b));
        if (hit && player.takeDamage(ENEMY_CONFIG.contactDamage, hit.x + hit.width / 2)) {
          game.onPlayerDamaged();
          break;
        }
      }
    }

    if (player.state !== PLAYER_STATES.DEATH && Collision.touchesHazard(hurtbox, level.tilemap)) {
      game.onHazard();
    }
  }
};
