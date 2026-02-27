# Student agent: Add your own agent here
from agents.agent import Agent
from store import register_agent
import sys
import numpy as np
from copy import deepcopy
import time
from helpers import random_move, count_capture, execute_move, check_endgame, get_valid_moves

@register_agent("student_agent")
class StudentAgent(Agent):
    """
    A class for your implementation. Feel free to use this class to
    add any helper functionalities needed for your agent.
    """

    def __init__(self):
        super(StudentAgent, self).__init__()
        self.name = "StudentAgent"
        self.max_depth = 5

    def step(self, chess_board, player, opponent):
        """
        Choose the best move using Alpha-Beta Pruning within the given time constraints.
        """
        start_time = time.time()
        best_move = None
        best_score = float('-inf')

        for move in get_valid_moves(chess_board, player):
            original_state = chess_board.copy()
            execute_move(chess_board, move, player)
            score = self.alpha_beta(chess_board, self.max_depth - 1, float('-inf'), float('inf'), False, player, opponent, start_time)
            chess_board[:] = original_state

            if score > best_score:
                best_score = score
                best_move = move

            if time.time() - start_time > 1.9:
                self.max_depth = max(1, self.max_depth - 1)
                break

        print(f"My AI's turn took {time.time() - start_time:.4f} seconds.")

        return best_move if best_move is not None else random_move(chess_board, player)

    def order_moves(self, chess_board, moves, player):
        """
        Orders moves based on various heuristics for better alpha-beta pruning.
        Returns list of moves ordered from most promising to least promising.
        """
        board_size = chess_board.shape[0]
        corners = {(0, 0), (0, board_size-1), (board_size-1, 0), (board_size-1, board_size-1)}
        edges = set((i, j) for i in [0, board_size-1] for j in range(board_size)) | \
                set((i, j) for i in range(board_size) for j in [0, board_size-1])
        
        def is_corner_adjacent(pos):
            r, c = pos
            corner_adjacent = set()
            for corner in corners:
                cr, cc = corner
                if abs(r - cr) <= 1 and abs(c - cc) <= 1 and (r, c) != (cr, cc):
                    corner_adjacent.add((r, c))
            return (r, c) in corner_adjacent

        move_scores = []
        for move in moves:
            score = 0
            r, c = move
            
            if (r, c) in corners:
                score += 1000
            
            elif is_corner_adjacent((r, c)):
                score -= 500
            
            elif (r, c) in edges:
                score += 100
            
            captures = count_capture(chess_board, move, player)
            score += captures * 10
            
            move_scores.append((move, score))
        
        sorted_moves = [move for move, score in sorted(move_scores, key=lambda x: x[1], reverse=True)]
        return sorted_moves

    def alpha_beta(self, chess_board, depth, alpha, beta, maximizing, player, opponent, start_time):
        """
        Alpha-beta pruning that uses move ordering.
        """
        if time.time() - start_time > 1.9:
            return 0

        is_endgame, _, _ = check_endgame(chess_board, player, opponent)
        if depth == 0 or is_endgame:
            return self.evaluate(chess_board, player, opponent)

        current_player = player if maximizing else opponent
        valid_moves = get_valid_moves(chess_board, current_player)
        if not valid_moves:
            return self.evaluate(chess_board, player, opponent)

        ordered_moves = self.order_moves(chess_board, valid_moves, current_player)
        
        if maximizing:
            max_eval = float('-inf')
            for move in ordered_moves:
                original_state = chess_board.copy()
                execute_move(chess_board, move, player)
                eval_score = self.alpha_beta(chess_board, depth - 1, alpha, beta, False, player, opponent, start_time)
                chess_board[:] = original_state
                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, max_eval)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for move in ordered_moves:
                original_state = chess_board.copy()
                execute_move(chess_board, move, opponent)
                eval_score = self.alpha_beta(chess_board, depth - 1, alpha, beta, True, player, opponent, start_time)
                chess_board[:] = original_state
                min_eval = min(min_eval, eval_score)
                beta = min(beta, min_eval)
                if beta <= alpha:
                    break
            return min_eval

    def evaluate(self, chess_board, player, opponent):
        """
        Evaluation function that considers position value, piece count, mobility and stability as heuristics
        """
        player_score = np.sum(chess_board == player)
        opponent_score = np.sum(chess_board == opponent)
        total_pieces = player_score + opponent_score
        board_size = chess_board.shape[0] * chess_board.shape[0]

        if total_pieces < board_size * 0.25:  # Early game
            mobility_weight = 5
            stability_weight = 3
            piece_weight = 1
            position_weight = 8  
        elif total_pieces < board_size * 0.75:  # Midgame
            mobility_weight = 3
            stability_weight = 5
            piece_weight = 3
            position_weight = 5  
        else:  
            mobility_weight = 1 # Endgame
            stability_weight = 5
            piece_weight = 10
            position_weight = 2  
        
        position_value = 0
        board_dim = chess_board.shape[0]
        corners = {(0, 0), (0, board_dim-1), (board_dim-1, 0), (board_dim-1, board_dim-1)}
        
        for r, c in corners:
            if chess_board[r, c] == player:
                position_value += 25
            elif chess_board[r, c] == opponent:
                position_value -= 25
        
        # Positions adjacent to corners (typically bad unless corner is owned)
        for corner_r, corner_c in corners:
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    r, c = corner_r + dr, corner_c + dc
                    if (r, c) != (corner_r, corner_c) and 0 <= r < board_dim and 0 <= c < board_dim:
                        # If we own the corner, adjacent positions become valuable
                        corner_owned = chess_board[corner_r, corner_c] == player
                        if chess_board[r, c] == player:
                            position_value += 10 if corner_owned else -10
                        elif chess_board[r, c] == opponent:
                            position_value -= 10 if corner_owned else -10

        edges = (set((i, j) for i in [0, board_dim-1] for j in range(board_dim)) |
                set((i, j) for i in range(board_dim) for j in [0, board_dim-1])) - corners
        for r, c in edges:
            if chess_board[r, c] == player:
                position_value += 5
            elif chess_board[r, c] == opponent:
                position_value -= 5

        mobility_value = len(get_valid_moves(chess_board, player)) - len(get_valid_moves(chess_board, opponent))
        
        stability_value = 0
        edge_positions = [(0, i) for i in range(chess_board.shape[0])] + \
                        [(chess_board.shape[0] - 1, i) for i in range(chess_board.shape[0])]
        for r, c in edge_positions:
            if chess_board[r, c] == player:
                stability_value += 5
            elif chess_board[r, c] == opponent:
                stability_value -= 5

        piece_count_value = player_score - opponent_score

        return (mobility_weight * mobility_value +
                stability_weight * stability_value +
                piece_weight * piece_count_value +
                position_weight * position_value)