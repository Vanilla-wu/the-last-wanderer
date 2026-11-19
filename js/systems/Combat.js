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
          damage: player.getAttackDamage(), heavy: player.isFinisher() || player.isSpiralFinal()
        });
        if (spinning && !player.isSpiralFinal()) {
          // 螺旋斬前兩斬：幾乎不擊退，讓敵人留在旋風裡吃下一斬
          enemy.velocityX *= 0.2;
          enemy.velocityY *= 0.4;
        } else if (player.isSpiralFinal()) {
          enemy.velocityX *= player.cfg.spiralFinalKnockback;
          game.hitstop = Math.max(game.hitstop, 0.1);
          game.camera.shake(5, 0.2);
        }
        if (player.isFinisher()) {
          // 連段收尾：擊退更遠、停頓更久
          enemy.velocityX *= player.cfg.finisherKnockback;
          game.hitstop = Math.max(game.hitstop, 0.11);
          game.camera.shake(5, 0.2);
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
      // 冰壁：蓄力斬能斬開，一般攻擊只會被彈開
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

    // 劍氣：可穿透，每個敵人只命中一次
    for (const wave of game.projectiles) {
      const box = wave.getHitbox();
      for (const enemy of level.enemies) {
        if (enemy.isDead || wave.hitTargets.has(enemy)) continue;
        if (!Collision.aabb(box, enemy.getHitbox())) continue;
        wave.hitTargets.add(enemy);
        const killed = enemy.takeHit(wave.damage, wave.facing);
        game.onEnemyHit(enemy, killed, wave.facing, { damage: wave.damage });
      }
      for (const b of level.breakables) {
        if (b.broken || wave.hitTargets.has(b) || !Collision.aabb(box, b.getHitbox())) continue;
        wave.hitTargets.add(b);
        game.onBreakableHit(b, b.takeHit(wave.damage), wave.facing);
      }
    }

    if (player.state === PLAYER_STATES.DEATH) return;

    const hurtbox = player.getHurtbox();
    for (const enemy of level.enemies) {
      if (enemy.isDead) continue;
      if (Collision.aabb(hurtbox, enemy.getHitbox()) && player.takeDamage(ENEMY_CONFIG.contactDamage, enemy.centerX)) {
        game.onPlayerDamaged();
        break;
      }
    }

    if (player.state !== PLAYER_STATES.DEATH && Collision.touchesHazard(hurtbox, level.tilemap)) {
      game.onHazard();
    }
  }
};
