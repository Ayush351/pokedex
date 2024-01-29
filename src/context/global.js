import { debounce } from "lodash";
import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";

const GlobalContext = createContext();

//actions
const LOADING = "LOADING";
const GET_POKEMON = "GET_POKEMON";
const GET_ALL_POKEMON = "GET_ALL_POKEMON";
const GET_SEARCH = "GET_SEARCH";
const GET_POKEMON_DATABASE = "GET_POKEMON_DATABASE";
const NEXT = "NEXT";

//reducer
const reducer = (state, action) => {
  switch (action.type) {
    case LOADING:
      return { ...state, loading: true };

    case GET_ALL_POKEMON:
      return {
        ...state,
        allPokemon: action.payload.results,
        next: action.payload.next,
        loading: false,
      };

    case GET_POKEMON:
      return { ...state, pokemon: action.payload, loading: false };

    case GET_POKEMON_DATABASE:
      return { ...state, pokemonDataBase: action.payload, loading: false };

    case GET_SEARCH:
      return { ...state, searchResults: action.payload, loading: false };

    case NEXT:
      return {
        ...state,
        allPokemon: [...state.allPokemon, ...action.payload.results],
        next: action.payload.next,
        loading: false,
      };
  }

  return state;
};

export const GlobalProvider = ({ children }) => {
  //base url
  const baseUrl = "https://pokeapi.co/api/v2/";

  //initial state
  const intitialState = {
    allPokemon: [],
    pokemon: {},
    pokemonDataBase: [],
    searchResults: [],
    next: "",
    loading: false,
  };

  const [state, dispatch] = useReducer(reducer, intitialState);
  const [allPokemonData, setAllPokemonData] = useState([]);

  const allPokemon = async () => {
    dispatch({ type: "LOADING" });

    const res = await fetch(`${baseUrl}pokemon?limit=21`);
    const data = await res.json();
    console.log(data);
    dispatch({ type: "GET_ALL_POKEMON", payload: data });

    //fetch character data
    //const allPokemonData = [];

    // for (const pokemon of data.results) {
    //   const pokemonRes = await fetch(pokemon.url);
    //   const pokemonData = await pokemonRes.json();
    //   allPokemonData.push(pokemonData);
    // }

    // made it fast by 8-9 secs  Parallelize Data Fetching:
    const fetchPokemonData = data.results.map(async (pokemon) => {
        const pokemonRes = await fetch(pokemon.url);
        return pokemonRes.json();
      });
      
      const allPokemonData = await Promise.all(fetchPokemonData);
    //
    setAllPokemonData(allPokemonData);
  };

  //get pokemon
  const getPokemon = async (name) => {
    dispatch({ type: "LOADING" });

    const res = await fetch(`${baseUrl}pokemon/${name}`);
    const data = await res.json();

    dispatch({ type: "GET_POKEMON", payload: data });
  };

  //get all pokemon data
  const getPokemonDatabase = async () => {
    dispatch({ type: "LOADING" });

    const res = await fetch(`${baseUrl}pokemon?limit=100000&offset=0`);
    const data = await res.json();

    dispatch({ type: "GET_POKEMON_DATABASE", payload: data.results });
  };

  //next page
  const next = async () => {
    dispatch({ type: "LOADING" });
    const res = await fetch(state.next);
    const data = await res.json();
    dispatch({ type: "NEXT", payload: data });


    // Fetch the new pokemon data in parallel
    const uniquePokemonUrls = new Set(allPokemonData.map((pokemon) => pokemon.url));
  

    //fetch the new pokemon data
    // const newPokemonData = [];
    // for (const pokemon of data.results) {
    //   const pokemonRes = await fetch(pokemon.url);
    //   const pokemonData = await pokemonRes.json();
    //   newPokemonData.push(pokemonData);
    // }

    //add new pokemon data to the old pokemon data
    // setAllPokemonData([...allPokemonData, ...newPokemonData]);

    // Parallelize Data Fetching for next page,for fast data retrieval
    const newPokemonData = data.results
    .filter((pokemon) => !uniquePokemonUrls.has(pokemon.url))
    .map(async (pokemon) => {
      const pokemonRes = await fetch(pokemon.url);
      return pokemonRes.json();
    });

  // Add new pokemon data to the existing data
  setAllPokemonData([...allPokemonData, ...(await Promise.all(newPokemonData))]);
  };

  //real time search
  const realTimeSearch = debounce(async (search) => {
    dispatch({ type: "LOADING" });
    //search pokemon database
    const res = state.pokemonDataBase.filter((pokemon) => {
      return pokemon.name.includes(search.toLowerCase());
    });

    dispatch({ type: "GET_SEARCH", payload: res });
  }, 500);

  //initial fetch
  useEffect(() => {
    getPokemonDatabase();
    allPokemon();
  }, []);

  return (
    <GlobalContext.Provider
      value={{
        ...state,
        allPokemonData,
        getPokemon,
        realTimeSearch,
        next,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  return useContext(GlobalContext);
};