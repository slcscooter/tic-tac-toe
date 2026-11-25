# Winning lines

Every way to win in Tic Tac Chaos: 228 lines of 5 cells. Rules of record: [game-rules.md](game-rules.md).

Cells are named by face and keypad number, as in the game: 1 is the top left of a face as it sits
on the unfolded cross, 5 the center, 9 the bottom right. Line numbers match the order of `LINES`
in `src/engine/cube.ts`.

This list was generated from `LINES` on 2026-11-25. If the lines ever change, regenerate it rather
than editing it by hand.

## How many lines go through each cell

| Cell | Lines | From corner Vs |
| --- | --- | --- |
| Face center (5) | 26 | 16 |
| Face corner (1, 3, 7, 9) | 21 | 6 |
| Edge middle (2, 4, 6, 8) | 20 | 0 |

Centers are the strongest cells because of the corner Vs.

## Straight rings

Each row and column of a face runs straight around four faces of the cube and back to where it
started: a ring of 12 cells. 9 rings, each with 12 runs of 5: 108 lines.

### Ring 1

Cells in order: Top 1, Top 4, Top 7, Front 1, Front 4, Front 7, Bottom 1, Bottom 4, Bottom 7, Back 9, Back 6, Back 3.

1. Top 1, Top 4, Top 7, Front 1, Front 4
2. Top 4, Top 7, Front 1, Front 4, Front 7
3. Top 7, Front 1, Front 4, Front 7, Bottom 1
4. Front 1, Front 4, Front 7, Bottom 1, Bottom 4
5. Front 4, Front 7, Bottom 1, Bottom 4, Bottom 7
6. Front 7, Bottom 1, Bottom 4, Bottom 7, Back 9
7. Bottom 1, Bottom 4, Bottom 7, Back 9, Back 6
8. Bottom 4, Bottom 7, Back 9, Back 6, Back 3
9. Bottom 7, Back 9, Back 6, Back 3, Top 1
10. Back 9, Back 6, Back 3, Top 1, Top 4
11. Back 6, Back 3, Top 1, Top 4, Top 7
12. Back 3, Top 1, Top 4, Top 7, Front 1

### Ring 2

Cells in order: Top 1, Top 2, Top 3, Right 3, Right 6, Right 9, Bottom 9, Bottom 8, Bottom 7, Left 7, Left 4, Left 1.

13. Top 1, Top 2, Top 3, Right 3, Right 6
14. Top 2, Top 3, Right 3, Right 6, Right 9
15. Top 3, Right 3, Right 6, Right 9, Bottom 9
16. Right 3, Right 6, Right 9, Bottom 9, Bottom 8
17. Right 6, Right 9, Bottom 9, Bottom 8, Bottom 7
18. Right 9, Bottom 9, Bottom 8, Bottom 7, Left 7
19. Bottom 9, Bottom 8, Bottom 7, Left 7, Left 4
20. Bottom 8, Bottom 7, Left 7, Left 4, Left 1
21. Bottom 7, Left 7, Left 4, Left 1, Top 1
22. Left 7, Left 4, Left 1, Top 1, Top 2
23. Left 4, Left 1, Top 1, Top 2, Top 3
24. Left 1, Top 1, Top 2, Top 3, Right 3

### Ring 3

Cells in order: Top 2, Top 5, Top 8, Front 2, Front 5, Front 8, Bottom 2, Bottom 5, Bottom 8, Back 8, Back 5, Back 2.

25. Top 2, Top 5, Top 8, Front 2, Front 5
26. Top 5, Top 8, Front 2, Front 5, Front 8
27. Top 8, Front 2, Front 5, Front 8, Bottom 2
28. Front 2, Front 5, Front 8, Bottom 2, Bottom 5
29. Front 5, Front 8, Bottom 2, Bottom 5, Bottom 8
30. Front 8, Bottom 2, Bottom 5, Bottom 8, Back 8
31. Bottom 2, Bottom 5, Bottom 8, Back 8, Back 5
32. Bottom 5, Bottom 8, Back 8, Back 5, Back 2
33. Bottom 8, Back 8, Back 5, Back 2, Top 2
34. Back 8, Back 5, Back 2, Top 2, Top 5
35. Back 5, Back 2, Top 2, Top 5, Top 8
36. Back 2, Top 2, Top 5, Top 8, Front 2

### Ring 4

Cells in order: Top 3, Top 6, Top 9, Front 3, Front 6, Front 9, Bottom 3, Bottom 6, Bottom 9, Back 7, Back 4, Back 1.

37. Top 3, Top 6, Top 9, Front 3, Front 6
38. Top 6, Top 9, Front 3, Front 6, Front 9
39. Top 9, Front 3, Front 6, Front 9, Bottom 3
40. Front 3, Front 6, Front 9, Bottom 3, Bottom 6
41. Front 6, Front 9, Bottom 3, Bottom 6, Bottom 9
42. Front 9, Bottom 3, Bottom 6, Bottom 9, Back 7
43. Bottom 3, Bottom 6, Bottom 9, Back 7, Back 4
44. Bottom 6, Bottom 9, Back 7, Back 4, Back 1
45. Bottom 9, Back 7, Back 4, Back 1, Top 3
46. Back 7, Back 4, Back 1, Top 3, Top 6
47. Back 4, Back 1, Top 3, Top 6, Top 9
48. Back 1, Top 3, Top 6, Top 9, Front 3

### Ring 5

Cells in order: Top 4, Top 5, Top 6, Right 2, Right 5, Right 8, Bottom 6, Bottom 5, Bottom 4, Left 8, Left 5, Left 2.

49. Top 4, Top 5, Top 6, Right 2, Right 5
50. Top 5, Top 6, Right 2, Right 5, Right 8
51. Top 6, Right 2, Right 5, Right 8, Bottom 6
52. Right 2, Right 5, Right 8, Bottom 6, Bottom 5
53. Right 5, Right 8, Bottom 6, Bottom 5, Bottom 4
54. Right 8, Bottom 6, Bottom 5, Bottom 4, Left 8
55. Bottom 6, Bottom 5, Bottom 4, Left 8, Left 5
56. Bottom 5, Bottom 4, Left 8, Left 5, Left 2
57. Bottom 4, Left 8, Left 5, Left 2, Top 4
58. Left 8, Left 5, Left 2, Top 4, Top 5
59. Left 5, Left 2, Top 4, Top 5, Top 6
60. Left 2, Top 4, Top 5, Top 6, Right 2

### Ring 6

Cells in order: Top 7, Top 8, Top 9, Right 1, Right 4, Right 7, Bottom 3, Bottom 2, Bottom 1, Left 9, Left 6, Left 3.

61. Top 7, Top 8, Top 9, Right 1, Right 4
62. Top 8, Top 9, Right 1, Right 4, Right 7
63. Top 9, Right 1, Right 4, Right 7, Bottom 3
64. Right 1, Right 4, Right 7, Bottom 3, Bottom 2
65. Right 4, Right 7, Bottom 3, Bottom 2, Bottom 1
66. Right 7, Bottom 3, Bottom 2, Bottom 1, Left 9
67. Bottom 3, Bottom 2, Bottom 1, Left 9, Left 6
68. Bottom 2, Bottom 1, Left 9, Left 6, Left 3
69. Bottom 1, Left 9, Left 6, Left 3, Top 7
70. Left 9, Left 6, Left 3, Top 7, Top 8
71. Left 6, Left 3, Top 7, Top 8, Top 9
72. Left 3, Top 7, Top 8, Top 9, Right 1

### Ring 7

Cells in order: Left 1, Left 2, Left 3, Front 1, Front 2, Front 3, Right 1, Right 2, Right 3, Back 1, Back 2, Back 3.

73. Left 1, Left 2, Left 3, Front 1, Front 2
74. Left 2, Left 3, Front 1, Front 2, Front 3
75. Left 3, Front 1, Front 2, Front 3, Right 1
76. Front 1, Front 2, Front 3, Right 1, Right 2
77. Front 2, Front 3, Right 1, Right 2, Right 3
78. Front 3, Right 1, Right 2, Right 3, Back 1
79. Right 1, Right 2, Right 3, Back 1, Back 2
80. Right 2, Right 3, Back 1, Back 2, Back 3
81. Right 3, Back 1, Back 2, Back 3, Left 1
82. Back 1, Back 2, Back 3, Left 1, Left 2
83. Back 2, Back 3, Left 1, Left 2, Left 3
84. Back 3, Left 1, Left 2, Left 3, Front 1

### Ring 8

Cells in order: Left 4, Left 5, Left 6, Front 4, Front 5, Front 6, Right 4, Right 5, Right 6, Back 4, Back 5, Back 6.

85. Left 4, Left 5, Left 6, Front 4, Front 5
86. Left 5, Left 6, Front 4, Front 5, Front 6
87. Left 6, Front 4, Front 5, Front 6, Right 4
88. Front 4, Front 5, Front 6, Right 4, Right 5
89. Front 5, Front 6, Right 4, Right 5, Right 6
90. Front 6, Right 4, Right 5, Right 6, Back 4
91. Right 4, Right 5, Right 6, Back 4, Back 5
92. Right 5, Right 6, Back 4, Back 5, Back 6
93. Right 6, Back 4, Back 5, Back 6, Left 4
94. Back 4, Back 5, Back 6, Left 4, Left 5
95. Back 5, Back 6, Left 4, Left 5, Left 6
96. Back 6, Left 4, Left 5, Left 6, Front 4

### Ring 9

Cells in order: Left 7, Left 8, Left 9, Front 7, Front 8, Front 9, Right 7, Right 8, Right 9, Back 7, Back 8, Back 9.

97. Left 7, Left 8, Left 9, Front 7, Front 8
98. Left 8, Left 9, Front 7, Front 8, Front 9
99. Left 9, Front 7, Front 8, Front 9, Right 7
100. Front 7, Front 8, Front 9, Right 7, Right 8
101. Front 8, Front 9, Right 7, Right 8, Right 9
102. Front 9, Right 7, Right 8, Right 9, Back 7
103. Right 7, Right 8, Right 9, Back 7, Back 8
104. Right 8, Right 9, Back 7, Back 8, Back 9
105. Right 9, Back 7, Back 8, Back 9, Left 7
106. Back 7, Back 8, Back 9, Left 7, Left 8
107. Back 8, Back 9, Left 7, Left 8, Left 9
108. Back 9, Left 7, Left 8, Left 9, Front 7

## Diagonal loops

A 45-degree diagonal that crosses a cube edge carries on onto the next face, and comes back round:
a loop of 9 cells. 8 loops, each with 9 runs of 5: 72 lines.

### Diagonal loop 1

Cells in order: Top 1, Left 2, Left 6, Front 7, Bottom 2, Bottom 6, Right 9, Back 4, Back 2.

109. Top 1, Left 2, Left 6, Front 7, Bottom 2
110. Left 2, Left 6, Front 7, Bottom 2, Bottom 6
111. Left 6, Front 7, Bottom 2, Bottom 6, Right 9
112. Front 7, Bottom 2, Bottom 6, Right 9, Back 4
113. Bottom 2, Bottom 6, Right 9, Back 4, Back 2
114. Bottom 6, Right 9, Back 4, Back 2, Top 1
115. Right 9, Back 4, Back 2, Top 1, Left 2
116. Back 4, Back 2, Top 1, Left 2, Left 6
117. Back 2, Top 1, Left 2, Left 6, Front 7

### Diagonal loop 2

Cells in order: Top 2, Top 6, Right 1, Front 6, Front 8, Bottom 1, Left 8, Left 4, Back 3.

118. Top 2, Top 6, Right 1, Front 6, Front 8
119. Top 6, Right 1, Front 6, Front 8, Bottom 1
120. Right 1, Front 6, Front 8, Bottom 1, Left 8
121. Front 6, Front 8, Bottom 1, Left 8, Left 4
122. Front 8, Bottom 1, Left 8, Left 4, Back 3
123. Bottom 1, Left 8, Left 4, Back 3, Top 2
124. Left 8, Left 4, Back 3, Top 2, Top 6
125. Left 4, Back 3, Top 2, Top 6, Right 1
126. Back 3, Top 2, Top 6, Right 1, Front 6

### Diagonal loop 3

Cells in order: Top 2, Top 4, Left 3, Front 4, Front 8, Bottom 3, Right 8, Right 6, Back 1.

127. Top 2, Top 4, Left 3, Front 4, Front 8
128. Top 4, Left 3, Front 4, Front 8, Bottom 3
129. Left 3, Front 4, Front 8, Bottom 3, Right 8
130. Front 4, Front 8, Bottom 3, Right 8, Right 6
131. Front 8, Bottom 3, Right 8, Right 6, Back 1
132. Bottom 3, Right 8, Right 6, Back 1, Top 2
133. Right 8, Right 6, Back 1, Top 2, Top 4
134. Right 6, Back 1, Top 2, Top 4, Left 3
135. Back 1, Top 2, Top 4, Left 3, Front 4

### Diagonal loop 4

Cells in order: Top 3, Right 2, Right 4, Front 9, Bottom 2, Bottom 4, Left 7, Back 6, Back 2.

136. Top 3, Right 2, Right 4, Front 9, Bottom 2
137. Right 2, Right 4, Front 9, Bottom 2, Bottom 4
138. Right 4, Front 9, Bottom 2, Bottom 4, Left 7
139. Front 9, Bottom 2, Bottom 4, Left 7, Back 6
140. Bottom 2, Bottom 4, Left 7, Back 6, Back 2
141. Bottom 4, Left 7, Back 6, Back 2, Top 3
142. Left 7, Back 6, Back 2, Top 3, Right 2
143. Back 6, Back 2, Top 3, Right 2, Right 4
144. Back 2, Top 3, Right 2, Right 4, Front 9

### Diagonal loop 5

Cells in order: Top 4, Top 8, Front 3, Right 4, Right 8, Bottom 9, Back 8, Back 6, Left 1.

145. Top 4, Top 8, Front 3, Right 4, Right 8
146. Top 8, Front 3, Right 4, Right 8, Bottom 9
147. Front 3, Right 4, Right 8, Bottom 9, Back 8
148. Right 4, Right 8, Bottom 9, Back 8, Back 6
149. Right 8, Bottom 9, Back 8, Back 6, Left 1
150. Bottom 9, Back 8, Back 6, Left 1, Top 4
151. Back 8, Back 6, Left 1, Top 4, Top 8
152. Back 6, Left 1, Top 4, Top 8, Front 3
153. Left 1, Top 4, Top 8, Front 3, Right 4

### Diagonal loop 6

Cells in order: Top 6, Top 8, Front 1, Left 6, Left 8, Bottom 7, Back 8, Back 4, Right 3.

154. Top 6, Top 8, Front 1, Left 6, Left 8
155. Top 8, Front 1, Left 6, Left 8, Bottom 7
156. Front 1, Left 6, Left 8, Bottom 7, Back 8
157. Left 6, Left 8, Bottom 7, Back 8, Back 4
158. Left 8, Bottom 7, Back 8, Back 4, Right 3
159. Bottom 7, Back 8, Back 4, Right 3, Top 6
160. Back 8, Back 4, Right 3, Top 6, Top 8
161. Back 4, Right 3, Top 6, Top 8, Front 1
162. Right 3, Top 6, Top 8, Front 1, Left 6

### Diagonal loop 7

Cells in order: Top 7, Front 2, Front 6, Right 7, Bottom 6, Bottom 8, Back 9, Left 4, Left 2.

163. Top 7, Front 2, Front 6, Right 7, Bottom 6
164. Front 2, Front 6, Right 7, Bottom 6, Bottom 8
165. Front 6, Right 7, Bottom 6, Bottom 8, Back 9
166. Right 7, Bottom 6, Bottom 8, Back 9, Left 4
167. Bottom 6, Bottom 8, Back 9, Left 4, Left 2
168. Bottom 8, Back 9, Left 4, Left 2, Top 7
169. Back 9, Left 4, Left 2, Top 7, Front 2
170. Left 4, Left 2, Top 7, Front 2, Front 6
171. Left 2, Top 7, Front 2, Front 6, Right 7

### Diagonal loop 8

Cells in order: Top 9, Front 2, Front 4, Left 9, Bottom 4, Bottom 8, Back 7, Right 6, Right 2.

172. Top 9, Front 2, Front 4, Left 9, Bottom 4
173. Front 2, Front 4, Left 9, Bottom 4, Bottom 8
174. Front 4, Left 9, Bottom 4, Bottom 8, Back 7
175. Left 9, Bottom 4, Bottom 8, Back 7, Right 6
176. Bottom 4, Bottom 8, Back 7, Right 6, Right 2
177. Bottom 8, Back 7, Right 6, Right 2, Top 9
178. Back 7, Right 6, Right 2, Top 9, Front 2
179. Right 6, Right 2, Top 9, Front 2, Front 4
180. Right 2, Top 9, Front 2, Front 4, Left 9

## Corner Vs

A face's corner-to-corner diagonal turns through a cube corner onto the corner-to-corner diagonal
of either other face there: a V of 6 cells. 24 Vs, each with 2 runs of 5: 48 lines.

### V 1

Cells in order: Top 9, Top 5, Top 1, Left 1, Left 5, Left 9.

181. Top 9, Top 5, Top 1, Left 1, Left 5
182. Top 5, Top 1, Left 1, Left 5, Left 9

### V 2

Cells in order: Top 1, Top 5, Top 9, Front 3, Front 5, Front 7.

183. Top 1, Top 5, Top 9, Front 3, Front 5
184. Top 5, Top 9, Front 3, Front 5, Front 7

### V 3

Cells in order: Top 1, Top 5, Top 9, Right 1, Right 5, Right 9.

185. Top 1, Top 5, Top 9, Right 1, Right 5
186. Top 5, Top 9, Right 1, Right 5, Right 9

### V 4

Cells in order: Top 9, Top 5, Top 1, Back 3, Back 5, Back 7.

187. Top 9, Top 5, Top 1, Back 3, Back 5
188. Top 5, Top 1, Back 3, Back 5, Back 7

### V 5

Cells in order: Top 3, Top 5, Top 7, Left 3, Left 5, Left 7.

189. Top 3, Top 5, Top 7, Left 3, Left 5
190. Top 5, Top 7, Left 3, Left 5, Left 7

### V 6

Cells in order: Top 3, Top 5, Top 7, Front 1, Front 5, Front 9.

191. Top 3, Top 5, Top 7, Front 1, Front 5
192. Top 5, Top 7, Front 1, Front 5, Front 9

### V 7

Cells in order: Top 7, Top 5, Top 3, Right 3, Right 5, Right 7.

193. Top 7, Top 5, Top 3, Right 3, Right 5
194. Top 5, Top 3, Right 3, Right 5, Right 7

### V 8

Cells in order: Top 7, Top 5, Top 3, Back 1, Back 5, Back 9.

195. Top 7, Top 5, Top 3, Back 1, Back 5
196. Top 5, Top 3, Back 1, Back 5, Back 9

### V 9

Cells in order: Left 1, Left 5, Left 9, Front 7, Front 5, Front 3.

197. Left 1, Left 5, Left 9, Front 7, Front 5
198. Left 5, Left 9, Front 7, Front 5, Front 3

### V 10

Cells in order: Left 9, Left 5, Left 1, Back 3, Back 5, Back 7.

199. Left 9, Left 5, Left 1, Back 3, Back 5
200. Left 5, Left 1, Back 3, Back 5, Back 7

### V 11

Cells in order: Left 1, Left 5, Left 9, Bottom 1, Bottom 5, Bottom 9.

201. Left 1, Left 5, Left 9, Bottom 1, Bottom 5
202. Left 5, Left 9, Bottom 1, Bottom 5, Bottom 9

### V 12

Cells in order: Left 7, Left 5, Left 3, Front 1, Front 5, Front 9.

203. Left 7, Left 5, Left 3, Front 1, Front 5
204. Left 5, Left 3, Front 1, Front 5, Front 9

### V 13

Cells in order: Left 3, Left 5, Left 7, Back 9, Back 5, Back 1.

205. Left 3, Left 5, Left 7, Back 9, Back 5
206. Left 5, Left 7, Back 9, Back 5, Back 1

### V 14

Cells in order: Left 3, Left 5, Left 7, Bottom 7, Bottom 5, Bottom 3.

207. Left 3, Left 5, Left 7, Bottom 7, Bottom 5
208. Left 5, Left 7, Bottom 7, Bottom 5, Bottom 3

### V 15

Cells in order: Front 1, Front 5, Front 9, Right 7, Right 5, Right 3.

209. Front 1, Front 5, Front 9, Right 7, Right 5
210. Front 5, Front 9, Right 7, Right 5, Right 3

### V 16

Cells in order: Front 1, Front 5, Front 9, Bottom 3, Bottom 5, Bottom 7.

211. Front 1, Front 5, Front 9, Bottom 3, Bottom 5
212. Front 5, Front 9, Bottom 3, Bottom 5, Bottom 7

### V 17

Cells in order: Front 7, Front 5, Front 3, Right 1, Right 5, Right 9.

213. Front 7, Front 5, Front 3, Right 1, Right 5
214. Front 5, Front 3, Right 1, Right 5, Right 9

### V 18

Cells in order: Front 3, Front 5, Front 7, Bottom 1, Bottom 5, Bottom 9.

215. Front 3, Front 5, Front 7, Bottom 1, Bottom 5
216. Front 5, Front 7, Bottom 1, Bottom 5, Bottom 9

### V 19

Cells in order: Right 1, Right 5, Right 9, Back 7, Back 5, Back 3.

217. Right 1, Right 5, Right 9, Back 7, Back 5
218. Right 5, Right 9, Back 7, Back 5, Back 3

### V 20

Cells in order: Right 1, Right 5, Right 9, Bottom 9, Bottom 5, Bottom 1.

219. Right 1, Right 5, Right 9, Bottom 9, Bottom 5
220. Right 5, Right 9, Bottom 9, Bottom 5, Bottom 1

### V 21

Cells in order: Right 7, Right 5, Right 3, Back 1, Back 5, Back 9.

221. Right 7, Right 5, Right 3, Back 1, Back 5
222. Right 5, Right 3, Back 1, Back 5, Back 9

### V 22

Cells in order: Right 3, Right 5, Right 7, Bottom 3, Bottom 5, Bottom 7.

223. Right 3, Right 5, Right 7, Bottom 3, Bottom 5
224. Right 5, Right 7, Bottom 3, Bottom 5, Bottom 7

### V 23

Cells in order: Back 1, Back 5, Back 9, Bottom 7, Bottom 5, Bottom 3.

225. Back 1, Back 5, Back 9, Bottom 7, Bottom 5
226. Back 5, Back 9, Bottom 7, Bottom 5, Bottom 3

### V 24

Cells in order: Back 3, Back 5, Back 7, Bottom 9, Bottom 5, Bottom 1.

227. Back 3, Back 5, Back 7, Bottom 9, Bottom 5
228. Back 5, Back 7, Bottom 9, Bottom 5, Bottom 1
