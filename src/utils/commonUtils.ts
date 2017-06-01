import cx from "classnames";

// return bem classnames  BLOCK__ELEM_MOD , like main-menu__button_half
const _ELEM_SEP = "__";
const _MOD_SEP = "_";

export function resolve_block(block) {
    return function (elem, mods, mix) {
        return bem_mod(block, elem, mods, mix)
    }
}
function normalize_mod(mod){
    if (mod == null || !mod)
        return [];

    var res = [{}];
    if (typeof mod === 'string')
        res[0][mod] = true;
    else if (Array.isArray(mod)) { //if array
        mod.map(function(mod_item){ res[0][mod_item]=true; })
    }
    else //if object
        res = [mod];
    return res;
}
export function join_bem_mods(...args_here: any[]) {
    var args = Array.prototype.slice.call(arguments);
    var mods = [{}];
    args.map(function(mod){mods = mods.concat(normalize_mod(mod)) });
    return Object.assign.apply(this, mods);
}

export default function bem_mod(block, elem = null, mods = null, mix = null) {
    var block_elem;
    if ((elem != null) && elem)
        block_elem = block + _ELEM_SEP + elem;
    else
        block_elem = block;

    var cn = [block_elem];
    var mod;

    if (mods != null) {
        if (typeof mods === 'string') {
            mods = [mods]
        }
        if (Array.isArray(mods)) {
            for (var i = 0, l = mods.length; i < l; i++) {
                mod = mods[i];
                if ((typeof mod === 'string') && (mod != null) && mod) {
                    cn.push(block_elem + _MOD_SEP + mod);
                }
            }
        }
        else {
            for (mod in mods) if (mods.hasOwnProperty(mod)) {
                if (mods[mod]) {
                    cn.push(block_elem + _MOD_SEP + mod);
                }
            }
        }
    }

    if (typeof mix === 'string') {
        cn.push(mix.trim());
    }
    else {
        if (mix != null) {
            cn.push(cx(mix));
        }
    }


    return cn.join(' ');
}