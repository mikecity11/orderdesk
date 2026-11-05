import {rm,mkdir,cp} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist/lib',{recursive:true});await cp('public','dist',{recursive:true});await cp('lib','dist/lib',{recursive:true});console.log('Built OrderDesk to dist/');
