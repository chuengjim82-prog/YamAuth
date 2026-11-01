import { defineStore } from 'pinia';
import { ref } from 'vue';

// 后端菜单树节点字段：menuName / menuUrl / menuIcon，parentId=0 表示根节点
export interface MenuNode {
  id: number;
  parentId: number;
  menuName: string;
  menuUrl: string;
  menuIcon: string;
  children: MenuNode[];
}

export const useMenuStore = defineStore('menu', () => {
  const tree = ref<MenuNode[]>([]);
  function setTree(t: MenuNode[]) { tree.value = t; }
  function clear() { tree.value = []; }
  return { tree, setTree, clear };
});
