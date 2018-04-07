public class CustomArrayList<E>{
    private static final int DEFAULT_INITIAL_CAPACITY = 5;
    private static final Object[] EMPTY_ELEMENT_DATA = {};
    private int size;

    /**
     * The array elements to be stored inside
     * customArrayListElementData.
     */
    private transient Object[] customArrayListElementData;

    /**
     * Constructs a custom arrayList with an initial capacity.
     * @param initialCapacity
     */
    public CustomArrayList(int initialCapacity){
      super();
         if (initialCapacity < 0)
             throw new IllegalArgumentException("Illegal Capacity: "+
                                                initialCapacity);
         this.customArrayListElementData = new Object[initialCapacity];
    }

    /**
     * Constructs an empty list.
     */
    public CustomArrayList(){
       super();
          this.customArrayListElementData = EMPTY_ELEMENT_DATA;
    }

    /**
     * @return the size of the CustomArrayList
     */
    public int size() {
     return size;
    }

 /**
  * @return true/false if size is greater then 0 return true else false.
  */
 public boolean isEmpty() {
  return size==0;
 }

 /**
  * return true
  * @param e
  */
 public boolean add(E e) {
   ensureCapacity(size + 1);
   customArrayListElementData[size++] = e;
   return true;
 }

 public void clear() {
        for (int i = 0; i < size; i++)
            customArrayListElementData[i] = null;

        size = 0;

 }
 /**
  * Returns the element at the specified position in this list.
  * @param index
  * @return
  */
 @SuppressWarnings("unchecked")
 public E get(int index) {
    if (index >= size){
     throw new ArrayIndexOutOfBoundsException("array index out of bound exception with index at"+index);
    }
  return (E)customArrayListElementData[index];
 }

 /**
  * add element at specific index position and shift the
  * customArrayListElementData.
  * @param index
  * @param element
  */
 public void add(int index, E element) {
  ensureCapacity(size + 1);
        System.arraycopy(customArrayListElementData, index, customArrayListElementData, index + 1,size - index);
        customArrayListElementData[index] = element;
        size++;

 }

 /**
  * Remove the element from the customArrayListElementData
  * and shift the elements position.
  * @param index
  * @return
  */
 @SuppressWarnings("unchecked")
 public E remove(int index) {
  E oldValue = (E)customArrayListElementData[index];

        int removeNumber = size - index - 1;
        if (removeNumber > 0){
            System.arraycopy(customArrayListElementData, index+1, customArrayListElementData, index,removeNumber);
        }
        customArrayListElementData[--size] = null;
        return oldValue;
 }

    /**
     * Increases the capacity to ensure that it can hold at least the
     * number of elements specified by the minimum capacity argument.
     *
     * @param minCapacity the desired minimum capacity
     */
    private void growCustomArrayList(int minCapacity) {
        int oldCapacity = customArrayListElementData.length;
        int newCapacity = oldCapacity + (oldCapacity /2);
        if (newCapacity - minCapacity < 0)
            newCapacity = minCapacity;
        //customArrayListElementData = Arrays.copyOf(customArrayListElementData, newCapacity);
    }

    /**
     * ensure the capacity and grow the customArrayList vi
     * growCustomArrayList(minCapacity);
     * @param minCapacity
     */
    private void ensureCapacity(int minCapacity) {
        if (customArrayListElementData == EMPTY_ELEMENT_DATA) {
            minCapacity = Math.max(DEFAULT_INITIAL_CAPACITY, minCapacity);
        }

        if (minCapacity - customArrayListElementData.length > 0)
            growCustomArrayList(minCapacity);
    }

    private static void arrayCopy(int[] source_arr, int sourcePos, int[] dest_arr, int destPos, int len) {
        for (int i = 0; i < len; i++) {
            dest_arr[destPos++] = source_arr[sourcePos++];
        }
    }

    private static int[] copyOf(int[] original, int newLength) {
        int newArray[] = new int[newLength];
        arrayCopy(original, 0, newArray, 0, original.length);
        return newArray;
    }
 /**
  * main method to test the custome array list
  */
 public static void main(String[] args) {
   // initializing an array original
       int[] org = new int[] {1, 2 ,3};

       System.out.println("Original Array");
       for (int i = 0; i < org.length; i++)
           System.out.print(org[i] + " ");

       // copying array org to copy
       int[] copy = copyOf(org, 5);

       // Changing some elements of copy
       copy[3] = 11;
       copy[4] = 55;

       System.out.println("\nNew array copy after modifications:");
       for (int i = 0; i < copy.length; i++)
           System.out.print(copy[i] + " ");
 }
}
